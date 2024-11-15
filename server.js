// server.js
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');
const sharp = require('sharp');
const path = require('path');

// Load environment variables from .env file only in development
if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
}

// Initialize Express app
const app = express();
const port = process.env.PORT || 10000;

// Middleware Configuration

// Enable CORS (Adjust the origin as needed)
app.use(cors({
    origin: 'http://localhost:10000', // Adjust if front-end is served from a different origin
    credentials: true
}));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Parse JSON bodies (as sent by API clients)
app.use(express.json());

// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({ extended: true }));

// Multer configuration for handling image uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Utility Functions

/**
 * Preprocesses the image by converting to grayscale, applying thresholding,
 * blurring, and compositing to simplify the object.
 * @param {Buffer} imageBuffer - The original image buffer.
 * @returns {Buffer} - The processed image buffer.
 */
const preprocessImage = async (imageBuffer) => {
    try {
        // Step 1: Convert image to grayscale
        const grayscaleImageBuffer = await sharp(imageBuffer)
            .greyscale()
            .toBuffer();

        // Step 2: Apply thresholding (convert to black and white)
        const thresholdImageBuffer = await sharp(grayscaleImageBuffer)
            .threshold(128)
            .toBuffer();

        // Step 3: Blur the image to simplify details
        const blurredImageBuffer = await sharp(thresholdImageBuffer)
            .blur(25)
            .toBuffer();

        // Step 4: Composite the blurred image with the thresholded image
        const simplifiedObjectBuffer = await sharp(thresholdImageBuffer)
            .composite([{ input: blurredImageBuffer, blend: 'over' }])
            .jpeg()
            .toBuffer();

        return simplifiedObjectBuffer;
    } catch (error) {
        console.error("Error during image preprocessing:", error);
        throw new Error('Image preprocessing failed.');
    }
};

/**
 * Encodes a Buffer into a Base64 string.
 * @param {Buffer} buffer - The buffer to encode.
 * @returns {string} - The Base64 encoded string.
 */
const encodeImage = (buffer) => {
    return buffer.toString('base64');
};

/**
 * Sends the processed image to the GPT-4o Vision API and retrieves the score.
 * @param {string} base64Image - The Base64 encoded image.
 * @returns {string} - The score returned by GPT-4o.
 */
const sendImageToGPT4o = async (base64Image) => {
    const api_key = process.env.OPENAI_API_KEY; // Ensure your API key is in the environment variables
    if (!api_key) {
        throw new Error('OpenAI API key is not defined in the environment variables.');
    }

    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${api_key}`
    };

    const payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "There is a cucumber object in this image. However the image has been greatly distorted your task is to give 2 scores from 40-100 based on the size and thickness of the cucumber. You must give 2 numbers comma separated regardless of how blurred the image is give your best estimate. Give a score of 1-100 of the size and a score of 1-100 of the thickness of the object. Only output two numbers comma separated that are specific not multiples of 10. After you are done and have the number."
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": `data:image/jpeg;base64,${base64Image}`
                        }
                    }
                ]
            }
        ],
        "max_tokens": 50
    };

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', payload, { headers });
        return response.data.choices[0].message.content.trim(); // Return the description from GPT-4o API
    } catch (error) {
        console.error("Error communicating with GPT-4o API:", error.response ? error.response.data : error.message);
        throw new Error('Failed to analyze the image.');
    }
};

// Routes

/**
 * Describe Route
 * Allows users to upload an image and receive ratings.
 */
app.post('/describe', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }

        // Preprocess the image (thresholding and blurring)
        const processedImageBuffer = await preprocessImage(req.file.buffer);

        // Convert the processed image to base64
        const base64Image = encodeImage(processedImageBuffer);

        // Send the processed image to GPT-4o and get the score
        const score = await sendImageToGPT4o(base64Image);

        // Send the processed image and the score back to the client
        res.json({ score });
    } catch (error) {
        console.error("Error processing the image:", error.message);
        res.status(500).json({ error: 'Failed to process the image.' });
    }
});

/**
 * Serve the Front-End (index.html and result.html) for all GET requests not handled by other routes.
 * This is useful for client-side routing if needed.
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/result.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'result.html'));
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
