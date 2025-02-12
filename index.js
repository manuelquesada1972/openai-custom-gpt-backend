import OpenAI from "openai";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ASSISTANT_ID = process.env.ASSISTANT_ID; // Store assistant_id in .env file

app.post("/api/chat", async (req, res) => {
    try {
        const { message, threadId } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        let thread_id = threadId;

        // Create a new thread if one doesn't exist
        if (!thread_id) {
            const thread = await openai.beta.threads.create();
            thread_id = thread.id;
        }

        // Send message to the thread
        await openai.beta.threads.messages.create(thread_id, {
            role: "user",
            content: message
        });

        // Run the Assistant on the thread
        const run = await openai.beta.threads.runs.create(thread_id, {
            assistant_id: ASSISTANT_ID
        });

        // Wait for Assistant to process response
        let run_status;
        do {
            run_status = await openai.beta.threads.runs.retrieve(thread_id, run.id);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before checking again
        } while (run_status.status !== "completed");

        // Retrieve response messages
        const messages = await openai.beta.threads.messages.list(thread_id);
        const lastMessage = messages.data.find(msg => msg.role === "assistant");

        res.json({ response: lastMessage.content, threadId: thread_id });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "An error occurred while processing your request" });
    }
});

// Start server locally
if (process.env.NODE_ENV !== "production") {
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;
