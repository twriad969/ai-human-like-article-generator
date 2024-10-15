# AI Article Generation and Publishing API

This project is an Express.js-based API for generating and publishing articles using Cloudflare's AI API. It allows users to request articles on specific topics, track the progress of the article generation, and publish them directly to a WordPress site. The API uses AI to generate comprehensive content based on a given topic and then formats the content for publishing.

## Features

- **AI-Powered Article Generation:** Uses Cloudflare's AI models to generate articles based on a topic.
- **Progress Tracking:** Users can track the status of their article requests via a unique tracking ID.
- **Formatted Content:** The generated content is cleaned and formatted into HTML for easy publishing.
- **WordPress Integration:** Automatically posts generated articles to a specified WordPress site.
- **User-Friendly API:** Simple REST API with JSON responses.

## Prerequisites

Before running the project, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (version 14.x or later)
- npm (comes with Node.js)
- A Cloudflare account with API access for AI models
- A WordPress site with REST API enabled and user credentials

## Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/ai-article-generator.git
   cd ai-article-generator
Install dependencies:

bash
Copy code
npm install
Environment Variables:

Create a .env file in the root directory and add the following:

env
Copy code
PORT=3000
CLOUD_FLARE_ACCOUNT_ID=your-cloudflare-account-id
CLOUD_FLARE_API_KEY=your-cloudflare-api-key
Run the server:

bash
Copy code
node index.js
API Endpoints
1. Request Article Generation
Endpoint: POST /api

Description: Initiates the article generation process based on the provided topic and posts the article to the specified WordPress site.

Request Body:

json
Copy code
{
  "username": "your_wp_username",
  "password": "your_wp_password",
  "topic": "comparison between React and Angular",
  "word_count": 4000,
  "site": "your-wordpress-site.com"
}
Response:

json
Copy code
{
  "message": "Article generation started",
  "tracking_url": "http://localhost:3000/article/<trackingId>"
}
2. Track Article Progress
Endpoint: GET /article/:trackingId

Description: Retrieves the current status of the article generation process.

Response:

json
Copy code
{
  "status": "Generating content",
  "percentage": 60,
  "description": "Generating content for subtopics..."
}
Example Usage
Request an article:

bash
Copy code
curl -X POST http://localhost:3000/api \
-H "Content-Type: application/json" \
-d '{
  "username": "admin",
  "password": "yourpassword",
  "topic": "React vs Angular",
  "word_count": 4000,
  "site": "example.com"
}'
Track the article generation progress:

bash
Copy code
curl http://localhost:3000/article/<trackingId>
Code Overview
Key Components
Express.js: The main framework for building the API.
Axios: Used for making HTTP requests to the Cloudflare AI API and WordPress API.
Body-Parser: Middleware to parse incoming request bodies in JSON format.
UUID: Used for generating unique tracking IDs for each article generation request.
File System (fs): Used to store user request data in a JSON file.
Functions
run(): Makes a request to the Cloudflare AI API to generate content based on the given model and inputs.
cleanText(): Cleans up the AI-generated text by converting markdown-like formatting into HTML.
formatArticleContent(): Formats the cleaned content into paragraphs, lists, and headings.
generateArticleWorker(): A background worker that handles the entire article generation process, from fetching subtopics to generating content for each and publishing to WordPress.
postToWordPress(): Publishes the generated article to a WordPress site using the REST API.
Progress Tracking
The progressTracker object is used to keep track of each article generation process. It holds data such as the current status, percentage completed, and a description of the task being performed.

Error Handling
The API provides detailed error messages in case of failures, such as:

Invalid or missing input fields
API request failures (to Cloudflare or WordPress)
Article generation errors
Usage
Once the server is running, you can use tools like Postman or cURL to interact with the API.

File Structure
bash
Copy code
.
├── index.js           # Main server file
├── user_requests.json # Logs user requests (auto-created)
├── package.json       # Node.js dependencies
├── README.md          # Project documentation
└── .env               # Environment variables
License
This project is licensed under the MIT License. See the LICENSE file for more details.

Author
Your Name
GitHub: @your-username
