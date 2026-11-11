package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/skinyanju/nyumbadirect/internal/models"
)

const (
	defaultGeocodeURL = "https://photon.komoot.io"
	geocodeCacheTTL   = 5 * time.Minute
	geocodeCacheMax   = 500
)

type geocodeCacheEntry struct {
	results   []models.GeocodeResult
	expiresAt time.Time
}

type GeocodeHandler struct {
	baseURL    string
	userAgent  string
	httpClient *http.Client

	mu    sync.Mutex
	cache map[string]geocodeCacheEntry
}

func NewGeocodeHandler() *GeocodeHandler {
	baseURL := os.Getenv("GEOCODE_URL")
	if baseURL == "" {
		baseURL = defaultGeocodeURL
	}
	userAgent := os.Getenv("GEOCODE_USER_AGENT")
	if userAgent == "" {
		userAgent = "NyumbaDirect/1.0 (+https://nyumbadirect.app)"
	}
	return &GeocodeHandler{
		baseURL:    strings.TrimRight(baseURL, "/"),
		userAgent:  userAgent,
		httpClient: &http.Client{Timeout: 5 * time.Second},
		cache:      make(map[string]geocodeCacheEntry),
	}
}

type photonProperties struct {
	OSMType  string `json:"osm_type"`
	OSMID    int64  `json:"osm_id"`
	Name     string `json:"name"`
	Street   string `json:"street"`
	Locality string `json:"locality"`
	District string `json:"district"`
	City     string `json:"city"`
	County   string `json:"county"`
	State    string `json:"state"`
	Country  string `json:"country"`
	Postcode string `json:"postcode"`
	OSMKey   string `json:"osm_key"`
	OSMValue string `json:"osm_value"`
}

type photonResponse struct {
	Features []struct {
		Properties photonProperties `json:"properties"`
		Geometry   struct {
			Coordinates []float64 `json:"coordinates"`
		} `json:"geometry"`
	} `json:"features"`
}

func (p photonProperties) formattedAddress() string {
	parts := []string{}
	seen := map[string]bool{}
	for _, part := range []string{p.Street, p.Locality, p.District, p.City, p.County, p.State, p.Postcode, p.Country} {
		part = strings.TrimSpace(part)
		if part == "" || seen[part] {
			continue
		}
		seen[part] = true
		parts = append(parts, part)
	}
	return strings.Join(parts, ", ")
}

func (h *GeocodeHandler) Search(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if q == "" {
		writeError(w, "query parameter 'q' is required", http.StatusBadRequest)
		return
	}
	if len(q) > 200 {
		writeError(w, "query is too long", http.StatusBadRequest)
		return
	}

	limit := 8
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil {
			limit = parsed
		}
	}
	if limit < 1 {
		limit = 1
	}
	if limit > 10 {
		limit = 10
	}

	params := url.Values{}
	params.Set("q", q)
	params.Set("limit", strconv.Itoa(limit))
	params.Set("lang", "en")
	if lat, lon, ok := biasFromQuery(r); ok {
		params.Set("lat", lat)
		params.Set("lon", lon)
	}

	cacheKey := "search:" + params.Encode()
	if cached, ok := h.getCached(cacheKey); ok {
		writeJSON(w, http.StatusOK, cached)
		return
	}

	results, err := h.fetch(r, "/api/?"+params.Encode())
	if err != nil {
		log.Printf("geocode search error: %v", err)
		writeError(w, "location search is unavailable right now", http.StatusBadGateway)
		return
	}

	h.setCached(cacheKey, results)
	writeJSON(w, http.StatusOK, results)
}

func (h *GeocodeHandler) Reverse(w http.ResponseWriter, r *http.Request) {
	lat, err := strconv.ParseFloat(r.URL.Query().Get("lat"), 64)
	if err != nil || lat < -90 || lat > 90 {
		writeError(w, "valid 'lat' is required", http.StatusBadRequest)
		return
	}
	lon, err := strconv.ParseFloat(r.URL.Query().Get("lon"), 64)
	if err != nil || lon < -180 || lon > 180 {
		writeError(w, "valid 'lon' is required", http.StatusBadRequest)
		return
	}

	params := url.Values{}
	params.Set("lat", strconv.FormatFloat(lat, 'f', 6, 64))
	params.Set("lon", strconv.FormatFloat(lon, 'f', 6, 64))
	params.Set("lang", "en")
	params.Set("limit", "1")

	cacheKey := "reverse:" + params.Encode()
	if cached, ok := h.getCached(cacheKey); ok {
		if len(cached) == 0 {
			writeJSON(w, http.StatusOK, nil)
			return
		}
		writeJSON(w, http.StatusOK, cached[0])
		return
	}

	results, err := h.fetch(r, "/reverse?"+params.Encode())
	if err != nil {
		log.Printf("geocode reverse error: %v", err)
		writeError(w, "reverse geocoding is unavailable right now", http.StatusBadGateway)
		return
	}

	h.setCached(cacheKey, results)
	if len(results) == 0 {
		writeJSON(w, http.StatusOK, nil)
		return
	}
	writeJSON(w, http.StatusOK, results[0])
}

func biasFromQuery(r *http.Request) (string, string, bool) {
	lat, latErr := strconv.ParseFloat(r.URL.Query().Get("lat"), 64)
	lon, lonErr := strconv.ParseFloat(r.URL.Query().Get("lon"), 64)
	if latErr != nil || lonErr != nil || lat < -90 || lat > 90 || lon < -180 || lon > 180 {
		return "", "", false
	}
	return strconv.FormatFloat(lat, 'f', 6, 64), strconv.FormatFloat(lon, 'f', 6, 64), true
}

func (h *GeocodeHandler) fetch(r *http.Request, pathAndQuery string) ([]models.GeocodeResult, error) {
	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, h.baseURL+pathAndQuery, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", h.userAgent)
	req.Header.Set("Accept", "application/json")

	res, err := h.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("geocoder returned status %d", res.StatusCode)
	}

	var payload photonResponse
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		return nil, err
	}

	results := make([]models.GeocodeResult, 0, len(payload.Features))
	for _, feature := range payload.Features {
		coords := feature.Geometry.Coordinates
		if len(coords) < 2 {
			continue
		}
		props := feature.Properties
		placeID := ""
		if props.OSMType != "" && props.OSMID != 0 {
			placeID = fmt.Sprintf("osm:%s/%d", props.OSMType, props.OSMID)
		}
		results = append(results, models.GeocodeResult{
			PlaceID:          placeID,
			Name:             props.Name,
			FormattedAddress: props.formattedAddress(),
			Latitude:         coords[1],
			Longitude:        coords[0],
			OSMType:          props.OSMType,
			OSMID:            props.OSMID,
			Category:         strings.Trim(strings.Join([]string{props.OSMKey, props.OSMValue}, "/"), "/"),
		})
	}
	return results, nil
}

func (h *GeocodeHandler) getCached(key string) ([]models.GeocodeResult, bool) {
	h.mu.Lock()
	defer h.mu.Unlock()

	entry, ok := h.cache[key]
	if !ok {
		return nil, false
	}
	if time.Now().After(entry.expiresAt) {
		delete(h.cache, key)
		return nil, false
	}
	return entry.results, true
}

func (h *GeocodeHandler) setCached(key string, results []models.GeocodeResult) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if len(h.cache) >= geocodeCacheMax {
		for k := range h.cache {
			delete(h.cache, k)
			break
		}
	}
	h.cache[key] = geocodeCacheEntry{
		results:   results,
		expiresAt: time.Now().Add(geocodeCacheTTL),
	}
}
