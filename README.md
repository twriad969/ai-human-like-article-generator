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


