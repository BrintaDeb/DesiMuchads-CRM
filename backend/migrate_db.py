import sqlite3
import os

for db_path in ["backend/muchadcrm.db", "backend/test_muchadcrm.db", "muchadcrm.db", "test_muchadcrm.db"]:
    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        if c.fetchone():
            c.execute("PRAGMA table_info(users)")
            cols = [r[1] for r in c.fetchall()]
            if "permissions" not in cols:
                print(f"Adding permissions column to {db_path}...")
                c.execute("ALTER TABLE users ADD COLUMN permissions JSON DEFAULT '[]'")
                conn.commit()
                print(f"Added permissions to {db_path}")
            else:
                print(f"permissions already in {db_path}")

            if "phone" not in cols:
                print(f"Adding phone column to {db_path}...")
                c.execute("ALTER TABLE users ADD COLUMN phone VARCHAR(50) DEFAULT NULL")
                conn.commit()
                print(f"Added phone to {db_path}")
            else:
                print(f"phone already in {db_path}")
        else:
            print(f"Table users does not exist in {db_path} yet")
        conn.close()
