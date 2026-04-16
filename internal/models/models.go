package models

import (
	"bytes"
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"time"

	"gorm.io/datatypes"
)

type JSONIntMap map[string]int

func (m JSONIntMap) Value() (driver.Value, error) {
	if m == nil {
		return "{}", nil
	}

	encoded, err := json.Marshal(m)
	if err != nil {
		return nil, fmt.Errorf("marshal JSONIntMap: %w", err)
	}

	return string(encoded), nil
}

func (m *JSONIntMap) Scan(value any) error {
	if m == nil {
		return errors.New("scan JSONIntMap: nil receiver")
	}

	switch v := value.(type) {
	case nil:
		*m = JSONIntMap{}
		return nil
	case []byte:
		decoded, err := decodeJSONIntMap(v)
		if err != nil {
			return err
		}
		*m = decoded
		return nil
	case string:
		decoded, err := decodeJSONIntMap([]byte(v))
		if err != nil {
			return err
		}
		*m = decoded
		return nil
	case map[string]any:
		decoded := make(JSONIntMap, len(v))
		for key, value := range v {
			if count, ok := intFromAny(value); ok {
				decoded[key] = count
			}
		}
		*m = decoded
		return nil
	case map[string]int:
		decoded := make(JSONIntMap, len(v))
		for key, value := range v {
			decoded[key] = value
		}
		*m = decoded
		return nil
	case JSONIntMap:
		decoded := make(JSONIntMap, len(v))
		for key, value := range v {
			decoded[key] = value
		}
		*m = decoded
		return nil
	default:
		encoded, err := json.Marshal(v)
		if err != nil {
			return fmt.Errorf("scan JSONIntMap from %T: %w", value, err)
		}

		decoded, err := decodeJSONIntMap(encoded)
		if err != nil {
			return err
		}
		*m = decoded
		return nil
	}
}

func decodeJSONIntMap(raw []byte) (JSONIntMap, error) {
	trimmed := bytes.TrimSpace(raw)
	if len(trimmed) == 0 || bytes.Equal(trimmed, []byte("null")) {
		return JSONIntMap{}, nil
	}

	decoder := json.NewDecoder(bytes.NewReader(trimmed))
	decoder.UseNumber()

	decodedAny := map[string]any{}
	if err := decoder.Decode(&decodedAny); err != nil {
		return nil, fmt.Errorf("decode JSONIntMap: %w", err)
	}

	decoded := make(JSONIntMap, len(decodedAny))
	for key, value := range decodedAny {
		if count, ok := intFromAny(value); ok {
			decoded[key] = count
		}
	}

	return decoded, nil
}

func intFromAny(value any) (int, bool) {
	switch v := value.(type) {
	case int:
		return v, true
	case int8:
		return int(v), true
	case int16:
		return int(v), true
	case int32:
		return int(v), true
	case int64:
		return int(v), true
	case uint:
		return int(v), true
	case uint8:
		return int(v), true
	case uint16:
		return int(v), true
	case uint32:
		return int(v), true
	case uint64:
		return int(v), true
	case float32:
		return int(v), true
	case float64:
		return int(v), true
	case json.Number:
		if integer, err := v.Int64(); err == nil {
			return int(integer), true
		}
		if floatValue, err := v.Float64(); err == nil {
			return int(floatValue), true
		}
	case string:
		if integer, err := strconv.Atoi(v); err == nil {
			return integer, true
		}
	}

	return 0, false
}

type Server struct {
	ID          string     `gorm:"column:ID;primaryKey"`
	Address     string     `gorm:"column:Address;not null"`
	Country     string     `gorm:"column:Country;not null"`
	Latitute    float64    `gorm:"column:Latitute;not null"`
	Longitude   float64    `gorm:"column:Longitude;not null"`
	Status      int        `gorm:"column:Status;not null;default:0"`
	LastUpdated *time.Time `gorm:"column:LastUpdated"`
}

func (Server) TableName() string {
	return "Server"
}

type PlayersData struct {
	ServerID       string         `gorm:"column:ServerID;not null"`
	List           datatypes.JSON `gorm:"column:List;type:jsonb;not null"`
	MaxLast24Hours JSONIntMap     `gorm:"column:MaxLast24Hours;type:jsonb;not null"`
	MaxLast7Days   JSONIntMap     `gorm:"column:MaxLast7Days;type:jsonb;not null"`
	MaxLast30Days  JSONIntMap     `gorm:"column:MaxLast30Days;type:jsonb;not null"`
	Timestamp      time.Time      `gorm:"column:Timestamp;not null"`
}

func (PlayersData) TableName() string {
	return "PlayersData"
}

type ServerData struct {
	ServerID     string `gorm:"column:ServerID;not null"`
	Hostname     string `gorm:"column:Hostname;not null"`
	Map          string `gorm:"column:Map;not null"`
	MaxPlayers   int    `gorm:"column:MaxPlayers;not null"`
	PlayersCount int    `gorm:"column:PlayersCount;not null"`
	BotsCount    int    `gorm:"column:BotsCount;not null"`
	Version      string `gorm:"column:Version;not null"`
	Secure       bool   `gorm:"column:Secure;not null"`
	Tags         string `gorm:"column:Tags;not null"`
}

func (ServerData) TableName() string {
	return "ServerData"
}

type Metrics struct {
	ID                   int32      `gorm:"column:ID;primaryKey;autoIncrement"`
	CheckedLast24Hours   JSONIntMap `gorm:"column:CheckedLast24Hours;type:jsonb;not null"`
	CheckedLast7Days     JSONIntMap `gorm:"column:CheckedLast7Days;type:jsonb;not null"`
	CheckedLast30Days    JSONIntMap `gorm:"column:CheckedLast30Days;type:jsonb;not null"`
	PrefilterLast24Hours JSONIntMap `gorm:"column:PrefilterLast24Hours;type:jsonb;not null"`
	PrefilterLast7Days   JSONIntMap `gorm:"column:PrefilterLast7Days;type:jsonb;not null"`
	PrefilterLast30Days  JSONIntMap `gorm:"column:PrefilterLast30Days;type:jsonb;not null"`
	PlayersLast24Hours   JSONIntMap `gorm:"column:PlayersLast24Hours;type:jsonb;not null"`
	PlayersLast7Days     JSONIntMap `gorm:"column:PlayersLast7Days;type:jsonb;not null"`
	PlayersLast30Days    JSONIntMap `gorm:"column:PlayersLast30Days;type:jsonb;not null"`
}

func (Metrics) TableName() string {
	return "Metrics"
}

type RateLimit struct {
	ID          string    `gorm:"column:ID;primaryKey"`
	IP          string    `gorm:"column:IP;not null"`
	Kind        string    `gorm:"column:Kind;not null"`
	Count       int       `gorm:"column:Count;not null;default:0"`
	LastSeen    time.Time `gorm:"column:LastSeen;not null"`
	WindowStart time.Time `gorm:"column:WindowStart;not null"`
}

func (RateLimit) TableName() string {
	return "RateLimit"
}

type Tasks struct {
	ID           string         `gorm:"column:ID;primaryKey"`
	TaskKind     int            `gorm:"column:TaskKind;not null"`
	TaskData     datatypes.JSON `gorm:"column:TaskData;type:jsonb;not null"`
	TaskExecuted int            `gorm:"column:TaskExecuted;not null;default:0"`
}

func (Tasks) TableName() string {
	return "Tasks"
}
