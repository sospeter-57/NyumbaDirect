package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/skinyanju/nyumbadirect/internal/auth"
	"github.com/skinyanju/nyumbadirect/internal/database"
)

type UploadHandler struct {
	db *database.DB
}

func NewUploadHandler(db *database.DB) *UploadHandler {
	return &UploadHandler{db: db}
}

func (h *UploadHandler) ProfilePicture(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r)

	r.Body = http.MaxBytesReader(w, r.Body, 5<<20)

	if err := r.ParseMultipartForm(5 << 20); err != nil {
		writeError(w, "file too large or invalid form", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("profile_picture")
	if err != nil {
		writeError(w, "missing profile_picture field", http.StatusBadRequest)
		return
	}
	defer file.Close()

	ext := filepath.Ext(header.Filename)
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".gif" && ext != ".webp" {
		writeError(w, "unsupported file type (jpg, png, gif, webp only)", http.StatusBadRequest)
		return
	}

	dir := "uploads/profile_pictures"
	os.MkdirAll(dir, 0755)

	filename := fmt.Sprintf("user_%d_%d%s", userID, time.Now().UnixMilli(), ext)
	dest, err := os.Create(filepath.Join(dir, filename))
	if err != nil {
		writeError(w, "failed to save file", http.StatusInternalServerError)
		return
	}
	defer dest.Close()

	if _, err := io.Copy(dest, file); err != nil {
		writeError(w, "failed to write file", http.StatusInternalServerError)
		return
	}

	url := fmt.Sprintf("/uploads/profile_pictures/%s", filename)
	if err := h.db.UpdateProfilePicture(userID, url); err != nil {
		writeError(w, "failed to update profile", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"profile_picture": url})
}

func (h *UploadHandler) PropertyMedia(w http.ResponseWriter, r *http.Request) {
	propID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	userID := auth.GetUserID(r)
	if err != nil {
		writeError(w, "invalid property id", http.StatusBadRequest)
		return
	}

	prop, err := h.db.GetProperty(propID)
	if err != nil || prop.LandlordID != userID {
		writeError(w, "property not found", http.StatusNotFound)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 50<<20)

	if err := r.ParseMultipartForm(50 << 20); err != nil {
		writeError(w, "file too large or invalid form", http.StatusBadRequest)
		return
	}

	dir := "uploads/properties"
	os.MkdirAll(dir, 0755)

	var uploaded []map[string]string
	isFirst := true

	for key := range r.MultipartForm.File {
		files := r.MultipartForm.File[key]
		for _, fh := range files {
			file, err := fh.Open()
			if err != nil {
				continue
			}

			ext := filepath.Ext(fh.Filename)
			isVideo := ext == ".mp4" || ext == ".mov" || ext == ".webm" || ext == ".avi"
			isImage := ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".gif" || ext == ".webp"
			if !isVideo && !isImage {
				file.Close()
				continue
			}

			filename := fmt.Sprintf("prop_%d_%d%s", propID, time.Now().UnixMilli(), ext)
			dest, err := os.Create(filepath.Join(dir, filename))
			if err != nil {
				file.Close()
				continue
			}

			io.Copy(dest, file)
			dest.Close()
			file.Close()

			url := fmt.Sprintf("/uploads/properties/%s", filename)
			if isImage {
				h.db.SavePropertyPhoto(propID, url, isFirst)
				isFirst = false
			}

			uploaded = append(uploaded, map[string]string{
				"url":  url,
				"type": map[bool]string{true: "video", false: "image"}[isVideo],
			})
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"media": uploaded})
}
