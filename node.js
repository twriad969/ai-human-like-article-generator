const express = require('express');
const cors = require('cors'); // Import cors
const axios = require('axios');
const bodyParser = require('body-parser');
const uuid = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Use cors middleware
app.use(cors());
app.use(bodyParser.json());

const API_BASE_URL = "https://api.cloudflare.com/client/v4/accounts/0ad971c8fdbadd821d8f90003f7b4dcd/ai/run/";
const HEADERS = { Authorization: "Bearer uuNs7PKQ-1jIqASmaqhcGMK7zBbiYfx8X9JJR52g" };
const USER_REQUESTS_FILE = path.join(__dirname, "user_requests.json");
const progressTracker = {};

// Function to interact with Cloudflare AI
async function run(model, inputs) {
    console.log(`[INFO] Sending request to AI for model: ${model}`);
    try {
        const response = await axios.post(`${API_BASE_URL}${model}`, { messages: inputs }, { headers: HEADERS });
        console.log("[INFO] AI request successful!");
        return response.data;
    } catch (error) {
        console.error(`[ERROR] API request failed: ${error.message}`);
        return null;
    }
}

// Clean up AI responses
function cleanText(content) {
    return content
        .replace(/[\*\\"`]+/g, "") // Remove unwanted characters
        .trim();
}

// Generate a SEO-friendly title based on the user topic
async function generateTitle(topic) {
    const inputs = [
        { role: "system", content: "You are an expert title generator who creates engaging, SEO-friendly blog titles." },
        { role: "user", content: `Write a blog title about '${topic}'. Provide only one option, and if the title contains any special characters (like **), ignore them.` }
    ];

    const response = await run("@cf/meta/llama-3-8b-instruct", inputs);
    const generatedTitle = response?.result?.response || null;

    return generatedTitle?.replace(/[\*\*]+/g, "").trim() || `Exploring ${topic.charAt(0).toUpperCase() + topic.slice(1)}`;
}

// Format article content
function formatArticleContent(content) {
    const paragraphs = content.split("\n").filter(para => para.trim() !== "");
    let formattedContent = "";

    paragraphs.forEach(para => {
        para = cleanText(para.trim());

        if (/^(Section|Subtopic|Key|Overview|I+\.|\d+\.|[A-Z][a-zA-Z\s]+):/.test(para)) {
            formattedContent += `<h2>${para}</h2>\n`;
        } else if (para.startsWith("-")) {
            if (!formattedContent.endsWith("</ul>\n")) {
                formattedContent += "<ul>\n";
            }
            formattedContent += `<li>${para.slice(1).trim()}</li>\n`;
            if (para === paragraphs[paragraphs.length - 1] || !paragraphs[paragraphs.indexOf(para) + 1].startsWith("-")) {
                formattedContent += "</ul>\n";
            }
        } else {
            formattedContent += `<p>${para}</p>\n`;
        }
    });

    return formattedContent;
}

// Get topics from AI
async function getArticleTopics(topic) {
    const inputs = [
        { role: "system", content: "You are a highly skilled article writer." },
        { role: "user", content: `Create a detailed outline for an SEO-friendly article titled '${topic}'. Include engaging subheadings and brief descriptions for each.` }
    ];

    const response = await run("@cf/meta/llama-3-8b-instruct", inputs);
    return response?.result?.response || null;
}

// Generate content for each topic with a focus on readability and SEO
async function generateContentForTopic(topic, userTopic) {
    const inputs = [
        { role: "system", content: "You are a skilled writer who creates engaging, conversational articles without robotic phrasing." },
        { role: "user", content: `Write a detailed and friendly section for the topic '${userTopic} - ${topic}'. Make it informative, relatable, and easy to read, incorporating personal examples and insights.` }
    ];

    const response = await run("@cf/meta/llama-3-8b-instruct", inputs);
    return response?.result?.response || null;
}

// Check WordPress credentials by posting a demo article
async function checkWordPressCredentials(username, password, site) {
    const demoPost = {
        title: "Demo Post",
        content: "This is a demo post to verify WordPress credentials.",
        status: 'draft',
    };

    const endpoint = `https://${site}/wp-json/wp/v2/posts`;
    try {
        const response = await axios.post(endpoint, demoPost, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
            }
        });

        if (response.status === 201) {
            // Optionally delete the demo post after checking
            await axios.delete(`${endpoint}/${response.data.id}`, {
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
                },
            });
            return true; // Credentials are valid
        }
    } catch (error) {
        console.error(`[ERROR] WordPress credentials check failed: ${error.message}`);
        return false; // Credentials are invalid
    }
    return false; // Default to false if something unexpected happens
}

// Post the article to WordPress
async function postToWordPress(title, content, username, password, site) {
    console.log(`[INFO] Publishing article: '${title}' to WordPress...`);

    const endpoint = `https://${site}/wp-json/wp/v2/posts`;

    const post = {
        title,
        content,
        status: 'publish',
        excerpt: `Explore an in-depth comparison of ${title}. Discover key features, user engagement, and more.`, // Adding a meta description
        meta: {
            // Additional SEO fields can be added here
        }
    };

    const response = await axios.post(endpoint, post, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
        }
    });

    if (response.status !== 201) {
        console.error(`[ERROR] Failed to post to WordPress: ${response.statusText}`);
        throw new Error("Failed to post to WordPress. Check if the site URL is valid or if the credentials are correct.");
    }

    console.log("[INFO] Article successfully posted to WordPress!");
}

// Background worker for generating article
async function generateArticleWorker(trackingId, username, password, topic, wordCount, site) {
    progressTracker[trackingId] = { status: "Started", percentage: 0, description: "Initializing article generation..." };

    try {
        // Step 1: Check WordPress credentials
        progressTracker[trackingId].status = "Checking WordPress credentials";
        progressTracker[trackingId].percentage = 10;
        progressTracker[trackingId].description = "Verifying WordPress credentials...";

        const credentialsValid = await checkWordPressCredentials(username, password, site);
        if (!credentialsValid) {
            progressTracker[trackingId].status = "Invalid credentials";
            progressTracker[trackingId].percentage = 100;
            progressTracker[trackingId].description = "Invalid WordPress credentials. Please check your username and password.";
            return;
        }

        // Step 2: Generating subtopics
        progressTracker[trackingId].status = "Generating subtopics";
        progressTracker[trackingId].percentage = 20;
        progressTracker[trackingId].description = "Fetching subtopics from AI...";

        const topicResponse = await getArticleTopics(topic);
        if (topicResponse) {
            const lines = topicResponse.split("\n");
            const articleTitle = await generateTitle(topic);
            const topics = lines.slice(1).map(line => cleanText(line)).filter(Boolean);
            let fullArticle = "";
            let requestedTopics = 0;

            // Step 3: Generating content for each subtopic
            progressTracker[trackingId].status = "Generating content";
            progressTracker[trackingId].percentage = 30;
            progressTracker[trackingId].description = "Generating content for subtopics...";

            for (let i = 0; i < topics.length; i++) {
                const contentResponse = await generateContentForTopic(topics[i], topic);
                if (contentResponse) {
                    const formattedContent = formatArticleContent(contentResponse);
                    fullArticle += `<h2>${topics[i]}</h2>\n${formattedContent}\n\n`;
                    requestedTopics++;
                    const currentWordCount = fullArticle.split(/\s+/).length;

                    // Check if the word count meets or exceeds the user's request
                    if (currentWordCount >= wordCount) {
                        break; // Exit if we have enough content
                    }

                    progressTracker[trackingId].percentage = Math.min(30 + (requestedTopics / topics.length) * 50, 80);
                    progressTracker[trackingId].description = `Generating content for ${topics[i]}...`;
                }
            }

            // Step 4: Publishing to WordPress
            progressTracker[trackingId].status = "Publishing to WordPress";
            progressTracker[trackingId].percentage = 100;
            progressTracker[trackingId].description = "Publishing article to WordPress...";
            await postToWordPress(articleTitle, fullArticle, username, password, site);
            progressTracker[trackingId].status = "Completed";
            progressTracker[trackingId].description = "Article published successfully!";
        } else {
            progressTracker[trackingId].status = "Failed to generate topics";
            progressTracker[trackingId].percentage = 100;
            progressTracker[trackingId].description = "Failed to fetch subtopics from AI.";
        }
    } catch (error) {
        progressTracker[trackingId].status = `Error: ${error.message}`;
        progressTracker[trackingId].percentage = 100;
        progressTracker[trackingId].description = "An error occurred during article generation.";
    }
}

// API endpoint to request article generation
app.post('/api', async (req, res) => {
    const { username, password, topic, word_count = 4000, site } = req.body;

    if (!username || !password || !topic || !site) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const trackingId = uuid.v4();
    const requestData = { trackingId, username, password, topic, wordCount: word_count, site, timestamp: Date.now() };
    saveUserRequest(requestData);

    generateArticleWorker(trackingId, username, password, topic, word_count, site);

    const trackingUrl = `https://tracker-three-nu.vercel.app/?articleId=${trackingId}`;
    return res.status(202).json({ message: "Article generation started", tracking_url: trackingUrl });
});

// Save user request to a JSON file
function saveUserRequest(data) {
    if (!fs.existsSync(USER_REQUESTS_FILE)) {
        fs.writeFileSync(USER_REQUESTS_FILE, JSON.stringify([]));
    }

    const userRequests = JSON.parse(fs.readFileSync(USER_REQUESTS_FILE));
    userRequests.push(data);
    fs.writeFileSync(USER_REQUESTS_FILE, JSON.stringify(userRequests, null, 4));
}

// API endpoint to track article progress
app.get('/article/:trackingId', (req, res) => {
    const { trackingId } = req.params;
    if (progressTracker[trackingId]) {
        return res.json(progressTracker[trackingId]);
    }
    return res.status(404).json({ error: "Tracking ID not found" });
});

// Run the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
