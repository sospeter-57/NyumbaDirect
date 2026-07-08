package database

import (
	"database/sql"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	_ "github.com/mattn/go-sqlite3"

	"github.com/skinyanju/nyumbadirect/internal/models"
)

type DB struct {
	*sql.DB
	mu sync.Mutex
}

func New(dbPath string) (*DB, error) {
	db, err := sql.Open("sqlite3", fmt.Sprintf("%s?_journal_mode=WAL&_foreign_keys=on&_busy_timeout=5000", dbPath))
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}

	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)
	db.SetConnMaxLifetime(5 * time.Minute)

	d := &DB{DB: db}
	if err := d.migrate(); err != nil {
		return nil, fmt.Errorf("migrate: %w", err)
	}
	d.migrateColumns()
	return d, nil
}

func (d *DB) migrate() error {
	d.mu.Lock()
	defer d.mu.Unlock()

	tx, err := d.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	statements := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			phone TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			role TEXT NOT NULL CHECK(role IN ('tenant','landlord')),
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS properties (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			landlord_id INTEGER NOT NULL REFERENCES users(id),
			house_type TEXT NOT NULL CHECK(house_type IN ('Single','Bedsitter','1-Bed','2-Bed','3-Bed','Mansion')),
			rent REAL NOT NULL,
			deposit REAL NOT NULL DEFAULT 0,
			latitude REAL NOT NULL,
			longitude REAL NOT NULL,
			title TEXT NOT NULL DEFAULT '',
			description TEXT NOT NULL DEFAULT '',
			location_desc TEXT NOT NULL DEFAULT '',
			has_borehole INTEGER NOT NULL DEFAULT 0,
			is_tokens_meter INTEGER NOT NULL DEFAULT 0,
			has_hot_shower INTEGER NOT NULL DEFAULT 0,
			has_wifi INTEGER NOT NULL DEFAULT 0,
			gate_curfew_enabled INTEGER NOT NULL DEFAULT 0,
			water_rationing_active INTEGER NOT NULL DEFAULT 0,
			pets_allowed INTEGER NOT NULL DEFAULT 0,
			active_status TEXT NOT NULL DEFAULT 'PENDING_PAY' CHECK(active_status IN ('PENDING_PAY','ACTIVE','FLAGGED','INACTIVE')),
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS repair_rates (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
			item_name TEXT NOT NULL,
			cost REAL NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS subscriptions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL REFERENCES users(id),
			property_id INTEGER REFERENCES properties(id),
			type TEXT NOT NULL CHECK(type IN ('listing','unlock')),
			status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','ACTIVE','EXPIRED','FAILED')),
			mpesa_checkout_id TEXT,
			mpesa_receipt TEXT,
			phone TEXT NOT NULL,
			amount REAL NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			expires_at DATETIME
		)`,
		`CREATE TABLE IF NOT EXISTS contact_unlocks (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			tenant_id INTEGER NOT NULL REFERENCES users(id),
			property_id INTEGER NOT NULL REFERENCES properties(id),
			timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS property_reviews (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			tenant_id INTEGER NOT NULL REFERENCES users(id),
			property_id INTEGER NOT NULL REFERENCES properties(id),
			is_fraud INTEGER NOT NULL DEFAULT 0,
			is_occupied INTEGER NOT NULL DEFAULT 0,
			extra_fees INTEGER NOT NULL DEFAULT 0,
			comments TEXT DEFAULT '',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS property_photos (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
			url TEXT NOT NULL,
			is_primary INTEGER NOT NULL DEFAULT 0
		)`,
		`CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(active_status)`,
		`CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(latitude, longitude)`,
		`CREATE INDEX IF NOT EXISTS idx_properties_landlord ON properties(landlord_id)`,
		`CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_subscriptions_checkout ON subscriptions(mpesa_checkout_id)`,
		`CREATE INDEX IF NOT EXISTS idx_unlocks_property ON contact_unlocks(property_id)`,
		`CREATE INDEX IF NOT EXISTS idx_reviews_property ON property_reviews(property_id)`,
	}

	for _, stmt := range statements {
		if _, err := tx.Exec(stmt); err != nil {
			return fmt.Errorf("migrate stmt: %w", err)
		}
	}

	return tx.Commit()
}

func (d *DB) migrateColumns() {
	columns := []string{
		"ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT ''",
		"ALTER TABLE users ADD COLUMN business_name TEXT NOT NULL DEFAULT ''",
		"ALTER TABLE users ADD COLUMN profile_picture TEXT NOT NULL DEFAULT ''",
		"ALTER TABLE properties ADD COLUMN agreement_doc TEXT NOT NULL DEFAULT ''",
	}
	for _, stmt := range columns {
		d.Exec(stmt)
	}
}

func (d *DB) CreateUser(phone, passwordHash string, role models.Role, name, businessName string) (*models.User, error) {
	d.mu.Lock()
	defer d.mu.Unlock()

	res, err := d.Exec(
		"INSERT INTO users (phone, password_hash, role, name, business_name) VALUES (?, ?, ?, ?, ?)",
		phone, passwordHash, string(role), name, businessName,
	)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return d.GetUser(id)
}

func (d *DB) GetUser(id int64) (*models.User, error) {
	u := &models.User{}
	err := d.QueryRow(
		"SELECT id, phone, password_hash, role, name, business_name, profile_picture, created_at FROM users WHERE id = ?", id,
	).Scan(&u.ID, &u.Phone, &u.PasswordHash, &u.Role, &u.Name, &u.BusinessName, &u.ProfilePicture, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (d *DB) GetUserByPhone(phone string) (*models.User, error) {
	u := &models.User{}
	err := d.QueryRow(
		"SELECT id, phone, password_hash, role, name, business_name, profile_picture, created_at FROM users WHERE phone = ?", phone,
	).Scan(&u.ID, &u.Phone, &u.PasswordHash, &u.Role, &u.Name, &u.BusinessName, &u.ProfilePicture, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (d *DB) UpdateProfilePicture(userID int64, path string) error {
	d.mu.Lock()
	defer d.mu.Unlock()
	_, err := d.Exec("UPDATE users SET profile_picture = ? WHERE id = ?", path, userID)
	return err
}

func (d *DB) CreateProperty(landlordID int64, req *models.ListingRequest) (*models.Property, error) {
	d.mu.Lock()
	defer d.mu.Unlock()

	res, err := d.Exec(
		`INSERT INTO properties (landlord_id, house_type, rent, deposit, latitude, longitude,
			title, description, location_desc, has_borehole, is_tokens_meter, has_hot_shower,
			has_wifi, gate_curfew_enabled, water_rationing_active, pets_allowed, agreement_doc, active_status)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_PAY')`,
		landlordID, string(req.HouseType), req.Rent, req.Deposit,
		req.Latitude, req.Longitude, req.Title, req.Description, req.LocationDesc,
		boolToInt(req.HasBorehole), boolToInt(req.IsTokensMeter), boolToInt(req.HasHotShower),
		boolToInt(req.HasWiFi), boolToInt(req.GateCurfewEnabled), boolToInt(req.WaterRationing),
		boolToInt(req.PetsAllowed), req.AgreementDoc,
	)
	if err != nil {
		return nil, err
	}
	propID, _ := res.LastInsertId()

	for _, rr := range req.RepairRates {
		if _, err := d.Exec(
			"INSERT INTO repair_rates (property_id, item_name, cost) VALUES (?, ?, ?)",
			propID, rr.ItemName, rr.Cost,
		); err != nil {
			log.Printf("warning: failed to insert repair rate: %v", err)
		}
	}

	return d.GetProperty(propID)
}

func (d *DB) GetProperty(id int64) (*models.Property, error) {
	p := &models.Property{}
	var borehole, tokens, shower, wifi, curfew, water, pets int
	err := d.QueryRow(
		`SELECT id, landlord_id, house_type, rent, deposit, latitude, longitude,
			title, description, location_desc, has_borehole, is_tokens_meter, has_hot_shower,
			has_wifi, gate_curfew_enabled, water_rationing_active, pets_allowed, agreement_doc, active_status, created_at, updated_at
		 FROM properties WHERE id = ?`, id,
	).Scan(&p.ID, &p.LandlordID, &p.HouseType, &p.Rent, &p.Deposit,
		&p.Latitude, &p.Longitude, &p.Title, &p.Description, &p.LocationDesc,
		&borehole, &tokens, &shower, &wifi, &curfew, &water, &pets,
		&p.AgreementDoc, &p.ActiveStatus, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	p.HasBorehole = intToBool(borehole)
	p.IsTokensMeter = intToBool(tokens)
	p.HasHotShower = intToBool(shower)
	p.HasWiFi = intToBool(wifi)
	p.GateCurfewEnabled = intToBool(curfew)
	p.WaterRationing = intToBool(water)
	p.PetsAllowed = intToBool(pets)
	return p, nil
}

func (d *DB) UpdatePropertyStatus(id int64, status models.ActiveStatus) error {
	d.mu.Lock()
	defer d.mu.Unlock()
	_, err := d.Exec(
		"UPDATE properties SET active_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
		string(status), id,
	)
	return err
}

func (d *DB) ListPropertiesInBounds(north, south, east, west float64, statuses ...models.ActiveStatus) ([]*models.Property, error) {
	query := `SELECT id, landlord_id, house_type, rent, deposit, latitude, longitude,
			title, description, location_desc, has_borehole, is_tokens_meter, has_hot_shower,
			has_wifi, gate_curfew_enabled, water_rationing_active, pets_allowed, agreement_doc, active_status, created_at, updated_at
		 FROM properties WHERE latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?`

	args := []interface{}{south, north, west, east}
	if len(statuses) > 0 {
		placeholders := make([]string, len(statuses))
		for i, s := range statuses {
			placeholders[i] = "?"
			args = append(args, string(s))
		}
		query += " AND active_status IN (" + strings.Join(placeholders, ",") + ")"
	}

	rows, err := d.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var props []*models.Property
	for rows.Next() {
		p := &models.Property{}
		var borehole, tokens, shower, wifi, curfew, water, pets int
		if err := rows.Scan(&p.ID, &p.LandlordID, &p.HouseType, &p.Rent, &p.Deposit,
			&p.Latitude, &p.Longitude, &p.Title, &p.Description, &p.LocationDesc,
			&borehole, &tokens, &shower, &wifi, &curfew, &water, &pets,
			&p.AgreementDoc, &p.ActiveStatus, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		p.HasBorehole = intToBool(borehole)
		p.IsTokensMeter = intToBool(tokens)
		p.HasHotShower = intToBool(shower)
		p.HasWiFi = intToBool(wifi)
		p.GateCurfewEnabled = intToBool(curfew)
		p.WaterRationing = intToBool(water)
		p.PetsAllowed = intToBool(pets)
		props = append(props, p)
	}
	return props, nil
}

func (d *DB) GetLandlordProperties(landlordID int64) ([]*models.Property, error) {
	rows, err := d.Query(
		`SELECT id, landlord_id, house_type, rent, deposit, latitude, longitude,
			title, description, location_desc, has_borehole, is_tokens_meter, has_hot_shower,
			has_wifi, gate_curfew_enabled, water_rationing_active, pets_allowed, agreement_doc, active_status, created_at, updated_at
		 FROM properties WHERE landlord_id = ? ORDER BY created_at DESC`, landlordID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var props []*models.Property
	for rows.Next() {
		p := &models.Property{}
		var borehole, tokens, shower, wifi, curfew, water, pets int
		if err := rows.Scan(&p.ID, &p.LandlordID, &p.HouseType, &p.Rent, &p.Deposit,
			&p.Latitude, &p.Longitude, &p.Title, &p.Description, &p.LocationDesc,
			&borehole, &tokens, &shower, &wifi, &curfew, &water, &pets,
			&p.AgreementDoc, &p.ActiveStatus, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		p.HasBorehole = intToBool(borehole)
		p.IsTokensMeter = intToBool(tokens)
		p.HasHotShower = intToBool(shower)
		p.HasWiFi = intToBool(wifi)
		p.GateCurfewEnabled = intToBool(curfew)
		p.WaterRationing = intToBool(water)
		p.PetsAllowed = intToBool(pets)
		props = append(props, p)
	}
	return props, nil
}

func (d *DB) GetRepairRates(propertyID int64) ([]*models.RepairRate, error) {
	rows, err := d.Query(
		"SELECT id, property_id, item_name, cost FROM repair_rates WHERE property_id = ?",
		propertyID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rates []*models.RepairRate
	for rows.Next() {
		r := &models.RepairRate{}
		if err := rows.Scan(&r.ID, &r.PropertyID, &r.ItemName, &r.Cost); err != nil {
			return nil, err
		}
		rates = append(rates, r)
	}
	return rates, nil
}

func (d *DB) CreateSubscription(userID int64, propertyID *int64, subType string, phone string, amount float64) (*models.Subscription, error) {
	d.mu.Lock()
	defer d.mu.Unlock()

	res, err := d.Exec(
		`INSERT INTO subscriptions (user_id, property_id, type, status, phone, amount)
		 VALUES (?, ?, ?, 'PENDING', ?, ?)`,
		userID, propertyID, subType, phone, amount,
	)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return d.GetSubscription(id)
}

func (d *DB) GetSubscription(id int64) (*models.Subscription, error) {
	s := &models.Subscription{}
	var checkoutID, receipt sql.NullString
	err := d.QueryRow(
		`SELECT id, user_id, property_id, type, status, mpesa_checkout_id, mpesa_receipt,
			phone, amount, created_at, expires_at FROM subscriptions WHERE id = ?`, id,
	).Scan(&s.ID, &s.UserID, &s.PropertyID, &s.Type, &s.Status,
		&checkoutID, &receipt, &s.Phone, &s.Amount,
		&s.CreatedAt, &s.ExpiresAt)
	if err != nil {
		return nil, err
	}
	s.MpesaCheckoutID = checkoutID.String
	s.MpesaReceipt = receipt.String
	return s, nil
}

func (d *DB) GetSubscriptionByCheckoutID(checkoutID string) (*models.Subscription, error) {
	s := &models.Subscription{}
	var cid, receipt sql.NullString
	err := d.QueryRow(
		`SELECT id, user_id, property_id, type, status, mpesa_checkout_id, mpesa_receipt,
			phone, amount, created_at, expires_at FROM subscriptions WHERE mpesa_checkout_id = ?`, checkoutID,
	).Scan(&s.ID, &s.UserID, &s.PropertyID, &s.Type, &s.Status,
		&cid, &receipt, &s.Phone, &s.Amount,
		&s.CreatedAt, &s.ExpiresAt)
	if err != nil {
		return nil, err
	}
	s.MpesaCheckoutID = cid.String
	s.MpesaReceipt = receipt.String
	return s, nil
}

func (d *DB) UpdateSubscriptionSuccess(id int64, checkoutID, receipt string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.Exec(
		`UPDATE subscriptions SET status = 'ACTIVE', mpesa_checkout_id = ?, mpesa_receipt = ?,
		 expires_at = datetime('now', '+30 days') WHERE id = ?`,
		checkoutID, receipt, id,
	)
	return err
}

func (d *DB) UpdateSubscriptionStatus(id int64, status models.SubscriptionStatus) error {
	d.mu.Lock()
	defer d.mu.Unlock()
	_, err := d.Exec(
		"UPDATE subscriptions SET status = ? WHERE id = ?",
		string(status), id,
	)
	return err
}

func (d *DB) UpdateSubscriptionCheckoutID(id int64, checkoutID string) error {
	d.mu.Lock()
	defer d.mu.Unlock()
	_, err := d.Exec(
		"UPDATE subscriptions SET mpesa_checkout_id = ? WHERE id = ?",
		checkoutID, id,
	)
	return err
}

func (d *DB) CreateContactUnlock(tenantID, propertyID int64) (*models.ContactUnlock, error) {
	d.mu.Lock()
	defer d.mu.Unlock()

	res, err := d.Exec(
		"INSERT INTO contact_unlocks (tenant_id, property_id) VALUES (?, ?)",
		tenantID, propertyID,
	)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	u := &models.ContactUnlock{}
	err = d.QueryRow(
		"SELECT id, tenant_id, property_id, timestamp FROM contact_unlocks WHERE id = ?", id,
	).Scan(&u.ID, &u.TenantID, &u.PropertyID, &u.Timestamp)
	return u, err
}

func (d *DB) HasUnlockedProperty(tenantID, propertyID int64) (bool, error) {
	var count int
	err := d.QueryRow(
		"SELECT COUNT(*) FROM contact_unlocks WHERE tenant_id = ? AND property_id = ?",
		tenantID, propertyID,
	).Scan(&count)
	return count > 0, err
}

func (d *DB) CreateReview(review *models.PropertyReview) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.Exec(
		`INSERT INTO property_reviews (tenant_id, property_id, is_fraud, is_occupied, extra_fees, comments)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		review.TenantID, review.PropertyID, boolToInt(review.IsFraud),
		boolToInt(review.IsOccupied), boolToInt(review.ExtraFees), review.Comments,
	)
	if err != nil {
		return err
	}

	var fraudCount int
	d.QueryRow(
		"SELECT COUNT(*) FROM property_reviews WHERE property_id = ? AND is_fraud = 1",
		review.PropertyID,
	).Scan(&fraudCount)

	if fraudCount >= 3 {
		d.Exec(
			"UPDATE properties SET active_status = 'FLAGGED' WHERE id = ?",
			review.PropertyID,
		)
	}
	return nil
}

func (d *DB) GetPropertyReviews(propertyID int64) ([]*models.PropertyReview, error) {
	rows, err := d.Query(
		"SELECT id, tenant_id, property_id, is_fraud, is_occupied, extra_fees, comments, created_at FROM property_reviews WHERE property_id = ? ORDER BY created_at DESC",
		propertyID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reviews []*models.PropertyReview
	for rows.Next() {
		r := &models.PropertyReview{}
		var fraud, occupied, fees int
		if err := rows.Scan(&r.ID, &r.TenantID, &r.PropertyID, &fraud, &occupied, &fees, &r.Comments, &r.CreatedAt); err != nil {
			return nil, err
		}
		r.IsFraud = intToBool(fraud)
		r.IsOccupied = intToBool(occupied)
		r.ExtraFees = intToBool(fees)
		reviews = append(reviews, r)
	}
	return reviews, nil
}

func (d *DB) GetTrafficStats(propertyID int64) (*models.TrafficStats, error) {
	stats := &models.TrafficStats{}
	err := d.QueryRow(
		"SELECT COUNT(*) FROM contact_unlocks WHERE property_id = ?", propertyID,
	).Scan(&stats.TotalUnlocks)
	if err != nil {
		return nil, err
	}
	err = d.QueryRow(
		"SELECT COUNT(DISTINCT tenant_id) FROM contact_unlocks WHERE property_id = ?", propertyID,
	).Scan(&stats.UniqueTenants)
	return stats, err
}

func (d *DB) GetUserSubscription(userID int64, subType string) (*models.Subscription, error) {
	s := &models.Subscription{}
	var checkoutID, receipt sql.NullString
	err := d.QueryRow(
		`SELECT id, user_id, property_id, type, status, mpesa_checkout_id, mpesa_receipt,
			phone, amount, created_at, expires_at FROM subscriptions
		 WHERE user_id = ? AND type = ? AND status = 'ACTIVE' AND (expires_at IS NULL OR expires_at > datetime('now'))
		 ORDER BY created_at DESC LIMIT 1`,
		userID, subType,
	).Scan(&s.ID, &s.UserID, &s.PropertyID, &s.Type, &s.Status,
		&checkoutID, &receipt, &s.Phone, &s.Amount,
		&s.CreatedAt, &s.ExpiresAt)
	if err != nil {
		return nil, err
	}
	s.MpesaCheckoutID = checkoutID.String
	s.MpesaReceipt = receipt.String
	return s, nil
}

func (d *DB) GetLandlordByPropertyID(propertyID int64) (*models.User, error) {
	var landlordID int64
	err := d.QueryRow("SELECT landlord_id FROM properties WHERE id = ?", propertyID).Scan(&landlordID)
	if err != nil {
		return nil, err
	}
	return d.GetUser(landlordID)
}

func (d *DB) AverageRentWithinRadius(lat, lng float64, radiusKM float64, houseType models.HouseType) (float64, int, error) {
	degLat := radiusKM / 111.0
	degLng := radiusKM / (111.0 * 0.895)

	var avg sql.NullFloat64
	var count int

	err := d.QueryRow(
		`SELECT AVG(rent), COUNT(*) FROM properties
		 WHERE house_type = ? AND active_status = 'ACTIVE'
		 AND latitude BETWEEN ? AND ?
		 AND longitude BETWEEN ? AND ?`,
		string(houseType), lat-degLat, lat+degLat, lng-degLng, lng+degLng,
	).Scan(&avg, &count)
	if err != nil {
		return 0, 0, err
	}
	return avg.Float64, count, nil
}

func (d *DB) GetTenantUnlocks(userID int64) ([]map[string]interface{}, error) {
	rows, err := d.Query(
		`SELECT cu.id, cu.property_id, cu.timestamp, p.title, p.house_type
		 FROM contact_unlocks cu JOIN properties p ON cu.property_id = p.id
		 WHERE cu.tenant_id = ? ORDER BY cu.timestamp DESC`, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []map[string]interface{}
	for rows.Next() {
		var id, propID int64
		var ts time.Time
		var title, hType string
		if err := rows.Scan(&id, &propID, &ts, &title, &hType); err != nil {
			return nil, err
		}
		result = append(result, map[string]interface{}{
			"id":             id,
			"property_id":    propID,
			"property_title": title,
			"house_type":     hType,
			"unlocked_at":    ts,
		})
	}
	return result, nil
}

func (d *DB) GetTenantReviews(userID int64) ([]map[string]interface{}, error) {
	rows, err := d.Query(
		`SELECT pr.id, pr.property_id, pr.is_fraud, pr.is_occupied, pr.extra_fees, pr.comments, pr.created_at, p.title, p.house_type
		 FROM property_reviews pr JOIN properties p ON pr.property_id = p.id
		 WHERE pr.tenant_id = ? ORDER BY pr.created_at DESC`, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []map[string]interface{}
	for rows.Next() {
		var id, propID int64
		var fraud, occ, fees int
		var comments, title, hType string
		var createdAt time.Time
		if err := rows.Scan(&id, &propID, &fraud, &occ, &fees, &comments, &createdAt, &title, &hType); err != nil {
			return nil, err
		}
		result = append(result, map[string]interface{}{
			"id":             id,
			"property_id":    propID,
			"property_title": title,
			"house_type":     hType,
			"is_fraud":       fraud == 1,
			"is_occupied":    occ == 1,
			"extra_fees":     fees == 1,
			"comments":       comments,
			"created_at":     createdAt,
		})
	}
	return result, nil
}

func (d *DB) SavePropertyPhoto(propertyID int64, url string, isPrimary bool) error {
	d.mu.Lock()
	defer d.mu.Unlock()
	_, err := d.Exec(
		"INSERT INTO property_photos (property_id, url, is_primary) VALUES (?, ?, ?)",
		propertyID, url, boolToInt(isPrimary),
	)
	return err
}

func (d *DB) GetPropertyPhotos(propertyID int64) ([]models.PropertyPhoto, error) {
	rows, err := d.Query(
		"SELECT id, property_id, url, is_primary FROM property_photos WHERE property_id = ? ORDER BY is_primary DESC, id ASC",
		propertyID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var photos []models.PropertyPhoto
	for rows.Next() {
		var p models.PropertyPhoto
		if err := rows.Scan(&p.ID, &p.PropertyID, &p.URL, &p.IsPrimary); err != nil {
			return nil, err
		}
		photos = append(photos, p)
	}
	return photos, nil
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

func intToBool(i int) bool {
	return i == 1
}
