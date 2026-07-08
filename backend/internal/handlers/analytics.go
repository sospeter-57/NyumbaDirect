package handlers

import (
	"log"
	"math"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/skinyanju/nyumbadirect/internal/database"
	"github.com/skinyanju/nyumbadirect/internal/models"
)

type cacheKey struct {
	lat       float64
	lng       float64
	houseType models.HouseType
}

type cacheEntry struct {
	data      *models.AnalyticsResponse
	expiresAt time.Time
}

type AnalyticsHandler struct {
	db    *database.DB
	cache map[cacheKey]*cacheEntry
	mu    sync.RWMutex
	ttl   time.Duration
}

func NewAnalyticsHandler(db *database.DB) *AnalyticsHandler {
	return &AnalyticsHandler{
		db:    db,
		cache: make(map[cacheKey]*cacheEntry),
		ttl:   12 * time.Hour,
	}
}

func (h *AnalyticsHandler) GetFairnessMetrics(w http.ResponseWriter, r *http.Request) {
	propID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, "invalid property id", http.StatusBadRequest)
		return
	}

	prop, err := h.db.GetProperty(propID)
	if err != nil {
		writeError(w, "property not found", http.StatusNotFound)
		return
	}

	radii := []struct {
		name string
		km   float64
	}{
		{"_1km", 1},
		{"_2km", 2},
		{"_5km", 5},
		{"_30km", 30},
	}

	result := &models.AnalyticsResponse{
		HouseType:    prop.HouseType,
		PropertyRent: prop.Rent,
	}

	for _, r := range radii {
		avg, count, err := h.getCachedAverage(prop.Latitude, prop.Longitude, r.km, prop.HouseType)
		if err != nil {
			log.Printf("analytics error for radius %s: %v", r.name, err)
			continue
		}

		switch r.name {
		case "_1km":
			result.AverageRent1km = avg
			result.SampleSize1km = count
			if count > 0 && avg > 0 {
				result.Deviation1km = ((prop.Rent - avg) / avg) * 100
			}
		case "_2km":
			result.AverageRent2km = avg
			result.SampleSize2km = count
			if count > 0 && avg > 0 {
				result.Deviation2km = ((prop.Rent - avg) / avg) * 100
			}
		case "_5km":
			result.AverageRent5km = avg
			result.SampleSize5km = count
			if count > 0 && avg > 0 {
				result.Deviation5km = ((prop.Rent - avg) / avg) * 100
			}
		case "_30km":
			result.AverageRent30km = avg
			result.SampleSize30km = count
			if count > 0 && avg > 0 {
				result.Deviation30km = ((prop.Rent - avg) / avg) * 100
			}
		}
	}

	writeJSON(w, http.StatusOK, result)
}

func (h *AnalyticsHandler) getCachedAverage(lat, lng, radiusKM float64, houseType models.HouseType) (float64, int, error) {
	key := cacheKey{
		lat:       math.Round(lat*100) / 100,
		lng:       math.Round(lng*100) / 100,
		houseType: houseType,
	}

	h.mu.RLock()
	entry, ok := h.cache[key]
	h.mu.RUnlock()

	if ok && time.Now().Before(entry.expiresAt) {
		avg := entry.data.AverageRent1km
		count := entry.data.SampleSize1km
		if radiusKM >= 2 {
			avg = entry.data.AverageRent2km
			count = entry.data.SampleSize2km
		}
		if radiusKM >= 5 {
			avg = entry.data.AverageRent5km
			count = entry.data.SampleSize5km
		}
		if radiusKM >= 30 {
			avg = entry.data.AverageRent30km
			count = entry.data.SampleSize30km
		}
		return avg, count, nil
	}

	avg, count, err := h.db.AverageRentWithinRadius(lat, lng, radiusKM, houseType)
	if err != nil {
		return 0, 0, err
	}

	h.mu.Lock()
	h.cache[key] = &cacheEntry{
		data: &models.AnalyticsResponse{
			AverageRent1km:  avg,
			SampleSize1km:   count,
		},
		expiresAt: time.Now().Add(h.ttl),
	}
	h.mu.Unlock()

	return avg, count, nil
}

func (h *AnalyticsHandler) ClearCache(w http.ResponseWriter, r *http.Request) {
	h.mu.Lock()
	h.cache = make(map[cacheKey]*cacheEntry)
	h.mu.Unlock()
	writeJSON(w, http.StatusOK, map[string]string{"status": "cache cleared"})
}
