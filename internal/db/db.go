package db

import (
	"fmt"
	"log"
	"net/url"
	"os"
	"strings"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"gorm.io/gorm/schema"
)

var yugabyteDatabase *gorm.DB

func PostgresURIToDSN(uri string) (string, error) {
	u, err := url.Parse(uri)
	if err != nil {
		return "", err
	}

	user := u.User.Username()
	pass, _ := u.User.Password()

	host := u.Host
	db := strings.TrimPrefix(u.Path, "/")

	// Default port
	if !strings.Contains(host, ":") {
		host += ":5432"
	}

	h := strings.Split(host, ":")

	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s",
		h[0],
		h[1],
		user,
		pass,
		db,
	)

	if u.RawQuery != "" {
		q, _ := url.ParseQuery(u.RawQuery)
		for k, v := range q {
			dsn += fmt.Sprintf(" %s=%s", k, v[0])
		}
	}

	return dsn, nil
}

func CreateYBDatabase() error {
	dsn, err := PostgresURIToDSN(os.Getenv("DATABASE_URL"))
	if err != nil {
		return err
	}

	db, err := gorm.Open(postgres.New(postgres.Config{
		DSN:                  dsn,
		PreferSimpleProtocol: true,
	}), &gorm.Config{
		NamingStrategy: schema.NamingStrategy{
			NoLowerCase: true,
		},
		Logger: logger.Default.LogMode(logger.Silent),
	})

	if err != nil {
		return err
	}

	sqlDB, err := db.DB()
	if err != nil {
		log.Fatal(err)
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxIdleTime(time.Minute * 5)
	sqlDB.SetConnMaxLifetime(time.Hour)

	yugabyteDatabase = db
	return nil
}

func GetYBDatabase() *gorm.DB {
	if yugabyteDatabase == nil {
		err := CreateYBDatabase()
		if err != nil {
			panic("Failed to connect to Yugabyte database: " + err.Error())
		}
	}

	return yugabyteDatabase
}
