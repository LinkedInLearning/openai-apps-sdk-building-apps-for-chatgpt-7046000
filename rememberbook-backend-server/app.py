from flask import Flask, request, jsonify
from flask_restful import Api, Resource
from flask_cors import CORS
from flasgger import Swagger, swag_from
from models import IdeaStore
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
api = Api(app)

# ---------------------------------------------------------------------------
# Configuration (make port configurable to avoid conflicts e.g. AirPlay on 5000)
# ---------------------------------------------------------------------------
PORT = int(os.environ.get("PORT", "5055"))  # default moved off 5000 to avoid macOS AirPlay conflicts
HOST = os.environ.get("HOST", "0.0.0.0")    # bind on all interfaces by default

# Initialize Swagger (host must reflect the runtime port)
swagger = Swagger(app, template={
  "swagger": "2.0",
  "info": {
    "title": "Remember Book API",
    "description": "A simple API for managing ideas and tasks",
    "version": "1.0.0"
  },
  "host": f"localhost:{PORT}",
  "basePath": "/",
  "schemes": ["http"]
})

# Database path (default file name in project root)
DB_PATH = os.environ.get("REMEMBERBOOK_DB", "rememberbook.db")

# Global idea store (SQLite-backed)
idea_store = IdeaStore(DB_PATH)

class IdeaListResource(Resource):
    def get(self):
        """
        Get all ideas (non-archived by default)
        ---
        tags:
          - Ideas
        parameters:
          - in: query
            name: includeArchived
            type: boolean
            required: false
            description: Include archived ideas when true
          - in: query
            name: archivedOnly
            type: boolean
            required: false
            description: Return only archived ideas when true (overrides includeArchived)
        responses:
          200:
            description: List of ideas
            schema:
              type: array
              items:
                type: object
                properties:
                  id:
                    type: string
                  title:
                    type: string
                  description:
                    type: string
                  notes:
                    type: array
                    items:
                      type: object
                      properties:
                        text:
                          type: string
                        timestamp:
                          type: string
                  urgency:
                    type: integer
                  archived:
                    type: boolean
                  created_date:
                    type: string
                  updated_date:
                    type: string
        """
        include_archived = request.args.get('includeArchived', 'false').lower() == 'true'
        archived_only = request.args.get('archivedOnly', 'false').lower() == 'true'
        ideas = idea_store.get_all_ideas()
        if archived_only:
            ideas = [i for i in ideas if i.archived]
        elif not include_archived:
            ideas = [i for i in ideas if not i.archived]
        return [idea.to_dict() for idea in ideas]
    
    def post(self):
        """
        Create a new idea
        ---
        tags:
          - Ideas
        parameters:
          - in: body
            name: idea
            required: true
            schema:
              type: object
              required:
                - title
                - description
              properties:
                title:
                  type: string
                  description: The title of the idea
                description:
                  type: string
                  description: The description of the idea
                urgency:
                  type: integer
                  minimum: 1
                  maximum: 5
                  default: 3
                  description: Urgency level (1=Not Important, 2=Low, 3=Medium, 4=High, 5=Immediate)
        responses:
          201:
            description: Idea created successfully
            schema:
              type: object
              properties:
                id:
                  type: string
                title:
                  type: string
                description:
                  type: string
                notes:
                  type: string
                urgency:
                  type: integer
                created_date:
                  type: string
                updated_date:
                  type: string
          400:
            description: Bad request
        """
        data = request.get_json()
        
        if not data or 'title' not in data or 'description' not in data:
            return {'error': 'Title and description are required'}, 400
        
        title = data['title']
        description = data['description']
        urgency = data.get('urgency', 3)
        
        if urgency not in range(1, 6):
            return {'error': 'Urgency must be between 1 and 5'}, 400
        
        idea = idea_store.create_idea(title, description, urgency)
        return idea.to_dict(), 201

class IdeaResource(Resource):
    def get(self, idea_id):
        """
        Get a specific idea
        ---
        tags:
          - Ideas
        parameters:
          - in: path
            name: idea_id
            type: string
            required: true
            description: The ID of the idea
        responses:
          200:
            description: Idea details
            schema:
              type: object
              properties:
                id:
                  type: string
                title:
                  type: string
                description:
                  type: string
                notes:
                  type: array
                  items:
                    type: object
                    properties:
                      text:
                        type: string
                      timestamp:
                        type: string
                urgency:
                  type: integer
                archived:
                  type: boolean
                created_date:
                  type: string
                updated_date:
                  type: string
          404:
            description: Idea not found
        """
        idea = idea_store.get_idea(idea_id)
        if not idea:
            return {'error': 'Idea not found'}, 404
        return idea.to_dict()
    
    def put(self, idea_id):
        """
        Update an existing idea
        ---
        tags:
          - Ideas
        parameters:
          - in: path
            name: idea_id
            type: string
            required: true
            description: The ID of the idea
          - in: body
            name: idea
            schema:
              type: object
              properties:
                title:
                  type: string
                description:
                  type: string
                notes:
                  type: array
                  description: Append one or more notes (strings or objects with text/timestamp)
                  items:
                    oneOf:
                      - type: string
                      - type: object
                        properties:
                          text:
                            type: string
                          timestamp:
                            type: string
                urgency:
                  type: integer
                  minimum: 1
                  maximum: 5
                archived:
                  type: boolean
        responses:
          200:
            description: Idea updated successfully
            schema:
              type: object
              properties:
                id:
                  type: string
                title:
                  type: string
                description:
                  type: string
                notes:
                  type: array
                  items:
                    type: object
                    properties:
                      text:
                        type: string
                      timestamp:
                        type: string
                urgency:
                  type: integer
                archived:
                  type: boolean
                created_date:
                  type: string
                updated_date:
                  type: string
          404:
            description: Idea not found
          400:
            description: Bad request
        """
        idea = idea_store.get_idea(idea_id)
        if not idea:
            return {'error': 'Idea not found'}, 404
        
        data = request.get_json()
        if not data:
            return {'error': 'No data provided'}, 400
        
        # Validate urgency if provided
        if 'urgency' in data and data['urgency'] not in range(1, 6):
            return {'error': 'Urgency must be between 1 and 5'}, 400
        
        updated_idea = idea_store.update_idea(idea_id, **data)
        return updated_idea.to_dict()
    
    def delete(self, idea_id):
        """
        Delete an idea
        ---
        tags:
          - Ideas
        parameters:
          - in: path
            name: idea_id
            type: string
            required: true
            description: The ID of the idea
        responses:
          200:
            description: Idea deleted successfully
          404:
            description: Idea not found
        """
        if idea_store.delete_idea(idea_id):
            return {'message': 'Idea deleted successfully'}
        return {'error': 'Idea not found'}, 404

class IdeaArchiveResource(Resource):
    def post(self, idea_id):
        """
        Archive an idea
        ---
        tags:
          - Ideas
        parameters:
          - in: path
            name: idea_id
            type: string
            required: true
        responses:
          200:
            description: Idea archived
          404:
            description: Idea not found
        """
        idea = idea_store.get_idea(idea_id)
        if not idea:
            return {'error': 'Idea not found'}, 404
        if not idea.archived:
            idea_store.update_idea(idea_id, archived=True)
        return {'message': 'Idea archived', 'id': idea_id}

class IdeaRestoreResource(Resource):
    def post(self, idea_id):
        """
        Restore (unarchive) an idea
        ---
        tags:
          - Ideas
        parameters:
          - in: path
            name: idea_id
            type: string
            required: true
        responses:
          200:
            description: Idea restored
          404:
            description: Idea not found
        """
        idea = idea_store.get_idea(idea_id)
        if not idea:
            return {'error': 'Idea not found'}, 404
        if idea.archived:
            idea_store.update_idea(idea_id, archived=False)
        return {'message': 'Idea restored', 'id': idea_id}

# Register API routes
api.add_resource(IdeaListResource, '/ideas')
api.add_resource(IdeaResource, '/ideas/<string:idea_id>')
api.add_resource(IdeaArchiveResource, '/ideas/<string:idea_id>/archive')
api.add_resource(IdeaRestoreResource, '/ideas/<string:idea_id>/restore')

@app.route('/')
def home():
    """
    Home page with API information
    ---
    responses:
      200:
        description: API information
    """
    return {
        'message': 'Welcome to Remember Book API',
        'version': '1.0.0',
        'endpoints': {
            'GET /ideas': 'Get all ideas',
            'POST /ideas': 'Create a new idea',
            'GET /ideas/<id>': 'Get a specific idea',
            'PUT /ideas/<id>': 'Update an idea',
      'DELETE /ideas/<id>': 'Delete an idea',
      'POST /ideas/<id>/archive': 'Archive an idea',
      'POST /ideas/<id>/restore': 'Restore an archived idea'
        },
        'swagger_ui': '/apidocs',
        'urgency_levels': {
            '1': 'Not Important',
            '2': 'Low',
            '3': 'Medium',
            '4': 'High',
            '5': 'Immediate'
        }
    }

if __name__ == '__main__':
  # Seed sample data only if database is empty (first run)
  if idea_store.is_empty():
    idea_store.create_idea("Learn Python", "Start with basic syntax and data structures", 4)
    idea_store.create_idea("Buy groceries", "Milk, bread, eggs, and vegetables", 3)
    idea_store.create_idea("Call mom", "Weekly check-in call", 2)

  print("Remember Book API Server starting...")
  print(f"Using database file: {DB_PATH}")
  print(f"Listening on: http://localhost:{PORT}")
  print(f"API Documentation: http://localhost:{PORT}/apidocs")
  print("Change port with PORT env var, e.g. PORT=7000 uv run python app.py")
  app.run(debug=True, host=HOST, port=PORT)