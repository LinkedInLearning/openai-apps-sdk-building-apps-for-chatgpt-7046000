"""Domain models and persistence layer for Remember Book.

Originally this project used an in-memory store. It now persists data
to a lightweight on-disk SQLite database (standard library only) so
ideas survive server restarts. The API surface (IdeaStore methods)
remains the same for the Flask resources to stay unchanged except for
initialisation (passing a db path).
"""

from datetime import datetime
from enum import Enum
from typing import List, Dict, Optional, Union, Any
import uuid
import sqlite3
import os
import json

class UrgencyLevel(Enum):
    IMMEDIATE = 5
    HIGH = 4
    MEDIUM = 3
    LOW = 2
    NOT_IMPORTANT = 1

class Idea:
    def __init__(self, title: str, description: str, urgency: UrgencyLevel = UrgencyLevel.MEDIUM):
        self.id = str(uuid.uuid4())
        self.title = title
        self.description = description
        # notes is now a list of note objects: {"text": str, "timestamp": ISO8601}
        self.notes: List[Dict[str, str]] = []  # persisted as JSON string in the DB
        self.urgency = urgency.value
        self.archived = False  # new flag for archived ideas
        self.created_date = datetime.now().isoformat()
        self.updated_date = datetime.now().isoformat()
    
    def to_dict(self) -> Dict:
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'notes': self.notes,  # list of note objects {text, timestamp}
            'urgency': self.urgency,
            'archived': self.archived,
            'created_date': self.created_date,
            'updated_date': self.updated_date
        }
    
    def update(self, title: Optional[str] = None, description: Optional[str] = None,
               notes: Optional[Union[str, List[str], List[Dict[str, Any]]]] = None,
               urgency: Optional[int] = None,
               archived: Optional[bool] = None):
        if title is not None:
            self.title = title
        if description is not None:
            self.description = description
        # Notes semantics: append new note(s) instead of overwrite
        if notes is not None:
            now = datetime.now().isoformat()
            if isinstance(notes, list):
                for n in notes:
                    if isinstance(n, dict) and 'text' in n:
                        text_val = str(n['text']).strip()
                        if text_val:
                            # preserve provided timestamp or add current
                            ts = n.get('timestamp') or now
                            self.notes.append({'text': text_val, 'timestamp': ts})
                    elif isinstance(n, str):
                        txt = n.strip()
                        if txt:
                            self.notes.append({'text': txt, 'timestamp': now})
            elif isinstance(notes, dict) and 'text' in notes:
                txt = str(notes['text']).strip()
                if txt:
                    ts = notes.get('timestamp') or now
                    self.notes.append({'text': txt, 'timestamp': ts})
            elif isinstance(notes, str):
                txt = notes.strip()
                if txt:
                    self.notes.append({'text': txt, 'timestamp': now})
        if urgency is not None:
            self.urgency = urgency
        if archived is not None:
            self.archived = bool(archived)
        self.updated_date = datetime.now().isoformat()

class IdeaStore:
    """Persistence layer wrapping a simple SQLite database.

    The database file is created automatically if it does not exist.
    Table schema is created with a single `ideas` table.
    """

    def __init__(self, db_path: str = "rememberbook.db"):
        self.db_path = db_path
        self._ensure_db()

    # --- internal helpers -------------------------------------------------
    def _connect(self):
        return sqlite3.connect(self.db_path)

    def _ensure_db(self):
        # Create directory if user points to a nested path
        directory = os.path.dirname(self.db_path)
        if directory and not os.path.exists(directory):
            os.makedirs(directory, exist_ok=True)
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS ideas (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    notes TEXT DEFAULT "[]", -- JSON encoded list of note strings
                    urgency INTEGER NOT NULL,
                    archived INTEGER NOT NULL DEFAULT 0,
                    created_date TEXT NOT NULL,
                    updated_date TEXT NOT NULL
                )
                """
            )
            # Backfill: add archived column if table existed without it
            cur = conn.execute("PRAGMA table_info(ideas)")
            cols = [r[1] for r in cur.fetchall()]
            if 'archived' not in cols:
                conn.execute("ALTER TABLE ideas ADD COLUMN archived INTEGER NOT NULL DEFAULT 0")
            conn.commit()

    # --- CRUD operations --------------------------------------------------
    def create_idea(self, title: str, description: str, urgency: int = 3) -> Idea:
        urgency_level = UrgencyLevel(urgency)
        idea = Idea(title, description, urgency_level)
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO ideas (id, title, description, notes, urgency, archived, created_date, updated_date) VALUES (?,?,?,?,?,?,?,?)",
                (
                    idea.id,
                    idea.title,
                    idea.description,
                    json.dumps(idea.notes),
                    idea.urgency,
                    0,
                    idea.created_date,
                    idea.updated_date,
                ),
            )
            conn.commit()
        return idea

    def _row_to_idea(self, row) -> Idea:
        # row order must match SELECT columns
        idea = Idea(row[1], row[2], UrgencyLevel(row[4]))
        idea.id = row[0]
        raw_notes = row[3]
        # Backwards compatibility handling for previous formats:
        # 1. Plain string (single note w/o timestamp)
        # 2. JSON list of strings
        # 3. Already in new format (list of objects)
        # 4. JSON object representing one note
        try:
            parsed = json.loads(raw_notes)
            if isinstance(parsed, list):
                converted: List[Dict[str, str]] = []
                for item in parsed:
                    if isinstance(item, dict) and 'text' in item:
                        text_val = str(item['text']).strip()
                        if text_val:
                            ts = item.get('timestamp') or datetime.now().isoformat()
                            converted.append({'text': text_val, 'timestamp': ts})
                    elif isinstance(item, str):
                        txt = item.strip()
                        if txt:
                            converted.append({'text': txt, 'timestamp': datetime.now().isoformat()})
                idea.notes = converted
            elif isinstance(parsed, dict) and 'text' in parsed:
                txt = str(parsed['text']).strip()
                if txt:
                    ts = parsed.get('timestamp') or datetime.now().isoformat()
                    idea.notes = [{'text': txt, 'timestamp': ts}]
            elif isinstance(parsed, str):
                txt = parsed.strip()
                idea.notes = [{'text': txt, 'timestamp': datetime.now().isoformat()}] if txt else []
            else:
                idea.notes = []
        except Exception:
            if raw_notes and raw_notes.strip():
                idea.notes = [{'text': raw_notes.strip(), 'timestamp': datetime.now().isoformat()}]
            else:
                idea.notes = []
        # Row layout with archived column: id, title, desc, notes, urgency, archived, created, updated
        idea.archived = bool(row[5]) if len(row) > 7 else False
        idea.created_date = row[6] if len(row) > 7 else row[5]
        idea.updated_date = row[7] if len(row) > 7 else row[6]
        return idea

    def get_idea(self, idea_id: str) -> Optional[Idea]:
        with self._connect() as conn:
            cur = conn.execute(
                "SELECT id, title, description, notes, urgency, archived, created_date, updated_date FROM ideas WHERE id=?",
                (idea_id,),
            )
            row = cur.fetchone()
        return self._row_to_idea(row) if row else None

    def get_all_ideas(self) -> List[Idea]:
        with self._connect() as conn:
            cur = conn.execute(
                "SELECT id, title, description, notes, urgency, archived, created_date, updated_date FROM ideas ORDER BY created_date DESC"
            )
            rows = cur.fetchall()
        return [self._row_to_idea(r) for r in rows]

    def update_idea(self, idea_id: str, **kwargs) -> Optional[Idea]:
        idea = self.get_idea(idea_id)
        if not idea:
            return None
        idea.update(
            title=kwargs.get("title"),
            description=kwargs.get("description"),
            notes=kwargs.get("notes"),
            urgency=kwargs.get("urgency"),
            # Ensure archived flag updates are propagated (was previously omitted)
            archived=kwargs.get("archived"),
        )
        with self._connect() as conn:
            conn.execute(
                """
                UPDATE ideas
                SET title=?, description=?, notes=?, urgency=?, archived=?, updated_date=?
                WHERE id=?
                """,
                (
                    idea.title,
                    idea.description,
                    json.dumps(idea.notes),
                    idea.urgency,
                    1 if idea.archived else 0,
                    idea.updated_date,
                    idea.id,
                ),
            )
            conn.commit()
        return idea

    def delete_idea(self, idea_id: str) -> bool:
        with self._connect() as conn:
            cur = conn.execute("DELETE FROM ideas WHERE id=?", (idea_id,))
            conn.commit()
            return cur.rowcount > 0

    # --- utility ----------------------------------------------------------
    def is_empty(self) -> bool:
        with self._connect() as conn:
            cur = conn.execute("SELECT COUNT(1) FROM ideas")
            (count,) = cur.fetchone()
        return count == 0