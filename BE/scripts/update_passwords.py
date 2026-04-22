"""Update all user passwords to Password@123 for development."""
import psycopg2

conn = psycopg2.connect(
    "postgresql://admin:kbOZpYYBZLfoeQRlBFajBfxi8A2JwPwk@dpg-ctlpcvrqf0us7389o680-a.singapore-postgres.render.com:5432/Recruit"
)
cur = conn.cursor()

new_hash = "$2b$12$j5g.K2tACU2U.aSP5nBxqew5k74NyweqYRmhTObWH9ZokL8Jgwz9S"
cur.execute("UPDATE users SET password_hash = %s", (new_hash,))
conn.commit()
print(f"Updated {cur.rowcount} users with password: Password@123")

cur.close()
conn.close()
