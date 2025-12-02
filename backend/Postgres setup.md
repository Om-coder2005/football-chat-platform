**PostgreSQL** **Setup** **Guide:** **Football** **Chat** **Platform**

**1.** **Purpose** **of** **this** **Document**

> ● **Standardization:** Define a standard way for every teammate to set
> up PostgreSQL for this project.
>
> ● **Consistency:** Ensure everyone uses the same database name
> (football_chat) and user (chat_user), but with their own local
> instance.
>
> ● **Security:** Avoid committing any real database passwords to
> GitHub.

**2.** **Tools** **Required**

> ● **PostgreSQL** (Server + SQL Shell “psql”; pgAdmin is optional). ●
> **Command** **Line** (CMD, PowerShell, or Terminal).
>
> ● **Code** **Editor** (VS Code recommended).
>
> ● **Project** **Folder:** football-chat-platform (cloned locally).

**3.** **Install** **PostgreSQL** **Locally**

> 1\. Download PostgreSQL from the [<u>oficial
> website</u>](https://www.postgresql.org/download/) for your operating
> system. 2. Run the installer and keep the following defaults:
>
> ○ **Port:** 5432
>
> ○ **Superuser:** postgres
>
> ○ **Components:** PostgreSQL Server, pgAdmin, Command Line Tools.
>
> 3\. **Critical:** Choose a strong password for the postgres superuser
> and **store** **it** **safely**.

**4.** **Create** **Project** **Database** **and** **User**

> 1\. Open the application **"SQL** **Shell** **(psql)"**. 2. Press
> **Enter** through the default prompts:
>
> ○ Server: localhost
>
> ○ Database: postgres ○ Port: 5432
>
> ○ Username: postgres
>
> 3\. Enter the **Password** you set during installation.
>
> 4\. When you see the prompt postgres=#, copy and run these commands
> one block at a time:

-- 1. Create the database and the new user CREATE DATABASE
football_chat;

CREATE USER chat_user WITH PASSWORD 'YourStrongPasswordHere!';

-- 2. Grant initial permissions

GRANT ALL PRIVILEGES ON DATABASE football_chat TO chat_user;

-- 3. Connect to the new database \c football_chat

-- 4. Set ownership and public schema permissions (Critical for
SQLAlchemy) ALTER DATABASE football_chat OWNER TO chat_user;

GRANT ALL ON SCHEMA public TO chat_user;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO chat_user; GRANT
ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO chat_user;

> **Note:** You can choose your own password for chat_user. Just
> remember it for the next step.

**5.** **Configure** **Backend** **Connection** **(Local)**

> 1\. Open the project in your editor.
>
> 2\. Navigate to: football-chat-platform/backend/app.py
>
> 3\. Update the SQLALCHEMY_DATABASE_URI configuration to use your
> **local** password:

app.config\["SQLALCHEMY_DATABASE_URI"\] = (

"postgresql+psycopg2://chat_user:YourStrongPasswordHere!@localhost:5432/football_chat"
)

⚠ **SECURITY** **WARNING**

> ● **NEVER** commit your real password to GitHub.
>
> ● **Before** **committing:** Change the password back to a placeholder
> like YOUR_DB_PASSWORD.
>
> ● *(Best* *Practice)*: Eventually, we should move this to a .env file
> so we don't have to edit the code manually.

**6.** **Create** **Tables** **by** **Running** **the** **Backend**

> 1\. Open a terminal and navigate to the backend folder: \# Update path
> to match your local folder structure cd
> "path/to/football-chat-platform/backend"
>
> 2\. Activate the virtual environment: \# Windows venv\Scripts\activate
>
> \# Mac/Linux
>
> source venv/bin/activate
>
> 3\. Start the backend server: python app.py

**Result:** On the first successful run, the application will connect to
PostgreSQL and automatically create the required tables (like
test_user).

**Verify** **Tables** **Exist**

Open SQL Shell (psql) again and run:

\c football_chat \d

*You* *should* *see* *test_user* *and* *test_user_id_seq* *listed.*

**7.** **Common** **Problems** **and** **Fixes**

||
||
||
||
||

**8.** **Summary** **Checklist**

> ● \[ \] PostgreSQL installed locally.
>
> ● \[ \] Database football_chat and user chat_user created.
>
> ● \[ \] backend/app.py updated with local password (temporarily). ● \[
> \] python app.py runs without errors.
