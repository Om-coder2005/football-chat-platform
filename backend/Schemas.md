**Database** **Schema:** **Football** **Chat** **Platform**

**1.** **Overview**

Database Name: football_chat

Current Phase: Core Functionality (Login, Communities, Chat)

This document outlines the table structures, relationships, and data
types required for the MVP (Minimum Viable Product).

**2.** **Entity** **Relationship** **Diagram** **(ERD)**

erDiagram

> USERS \|\|--o{ COMMUNITIES : "creates/hosts" USERS \|\|--o{
> COMMUNITY_MEMBERS : "joins"
>
> COMMUNITIES \|\|--o{ COMMUNITY_MEMBERS : "has members" USERS \|\|--o{
> MESSAGES : "sends"
>
> COMMUNITIES \|\|--o{ MESSAGES : "contains"
>
> USERS { int id PK
>
> string username string email
>
> string password_hash string favorite_club
>
> }
>
> COMMUNITIES { int id PK string name
>
> string club_name int host_user_id FK boolean is_public
>
> }
>
> COMMUNITY_MEMBERS { int id PK
>
> int community_id FK int user_id FK
>
> string role }
>
> MESSAGES { int id PK
>
> int community_id FK int user_id FK
>
> string message_text timestamp created_at
>
> }

**3.** **Table** **Definitions** 👤 **1.** **Table:** **users**

Stores all account information. Passwords must be hashed (e.g., using
Argon2 or Bcrypt) before storage.

||
||
||
||
||
||
||
||
||

**SQL:**

CREATE TABLE users (

> id SERIAL PRIMARY KEY,
>
> username VARCHAR(50) UNIQUE NOT NULL, email VARCHAR(100) UNIQUE NOT
> NULL, password_hash VARCHAR(255) NOT NULL,
>
> favorite_club VARCHAR(50),

created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP );

🏟 **2.** **Table:** **communities**

Represents a "room" or fan group dedicated to a specific club or topic.

||
||
||
||
||
||
||
||
||
||
||
||

**SQL:**

CREATE TABLE communities ( id SERIAL PRIMARY KEY,

> name VARCHAR(100) NOT NULL, club_name VARCHAR(50) NOT NULL,
>
> host_user_id INT NOT NULL REFERENCES users(id),
>
> description TEXT,
>
> join_code VARCHAR(20) UNIQUE, is_public BOOLEAN DEFAULT TRUE,
> member_count INT DEFAULT 0,

created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP );

🔗 **3.** **Table:** **community_members**

A junction table linking Users to Communities. It also defines their
permission level within that specific group.

||
||
||
||
||
||
||
||

**Constraint:** A user cannot join the same community twice.
UNIQUE(community_id, user_id).

**SQL:**

CREATE TABLE community_members ( id SERIAL PRIMARY KEY,

> community_id INT NOT NULL REFERENCES communities(id) ON DELETE
> CASCADE, user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
>
> role VARCHAR(20) DEFAULT 'member',
>
> joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(community_id,
> user_id)

);

💬 **4.** **Table:** **messages**

Stores the actual chat history.

||
||
||
||
||
||
||
||
||

**Performance:** Includes an index on (community_id, created_at DESC) to
ensure loading the last 50 messages is fast.

**SQL:**

CREATE TABLE messages ( id SERIAL PRIMARY KEY,

> community_id INT NOT NULL REFERENCES communities(id) ON DELETE
> CASCADE, user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
> message_text TEXT,
>
> message_type VARCHAR(20) DEFAULT 'text', created_at TIMESTAMP DEFAULT
> CURRENT_TIMESTAMP

);

-- Index for fast chat loading

CREATE INDEX idx_messages_community_recent ON messages(community_id,
created_at DESC);

🔮 **Future** **Considerations** *Tables* *planned* *for* *Phase* *2:*

> ● stickers: To store URLs of custom stickers.

● match_cache: To store live score data from external APIs temporarily.
