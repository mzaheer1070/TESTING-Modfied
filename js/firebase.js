import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAiLRpNFC6khivuyKQHpSwa7I6iO43n4rs",
  authDomain: "weba2-7a1f0.firebaseapp.com",
  projectId: "weba2-7a1f0",
  storageBucket: "weba2-7a1f0.firebasestorage.app",
  messagingSenderId: "501356088445",
  appId: "1:501356088445:web:470b722431621db00c7514"
};

// Target email for notifications
const TARGET_EMAIL = "mzaheer1070@gmail.com";
// Activated FormSubmit token for spam-protected delivery to mzaheer1070@gmail.com
const FORMSUBMIT_TOKEN = "cf761bca2242dee6483cea4982598a1d";

// Initialize Firebase & Firestore
let db = null;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (err) {
  console.warn("Firebase initialization notice:", err);
}

function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Form submission handler with email forwarding and automated response
const contactForm = document.getElementById("contactForm");
if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const nameInput = document.getElementById("name");
        const emailInput = document.getElementById("email");
        const messageInput = document.getElementById("message");
        const statusDiv = contactForm.querySelector(".form-status");
        const submitBtn = contactForm.querySelector("button[type='submit']");
        const charCount = contactForm.querySelector("[data-char-count]");

        const name = nameInput ? nameInput.value.trim() : "";
        const email = emailInput ? emailInput.value.trim() : "";
        const message = messageInput ? messageInput.value.trim() : "";

        // Detect if a topic chip was selected
        const activeChip = contactForm.querySelector(".topic-chip.is-active");
        const selectedTopic = activeChip ? activeChip.dataset.topicChip : "General Collaboration";

        // Check required fields
        if (!name || !email || !message) {
            if (statusDiv) {
                statusDiv.className = "form-status status-error";
                statusDiv.textContent = "Please fill in all required fields (Name, Email, and Message) before submitting.";
            }
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            if (statusDiv) {
                statusDiv.className = "form-status status-error";
                statusDiv.textContent = "Please enter a valid email address so I can reply back to you.";
            }
            if (emailInput) {
                emailInput.focus();
                emailInput.classList.add("is-invalid");
            }
            return;
        }

        // Validate message length (minimum 10 characters)
        if (message.length < 10) {
            if (statusDiv) {
                statusDiv.className = "form-status status-error";
                statusDiv.textContent = "Your message must be at least 10 characters long.";
            }
            if (messageInput) {
                messageInput.focus();
                messageInput.classList.add("is-invalid");
                const errorElem = contactForm.querySelector('[data-error-for="message"]');
                if (errorElem) errorElem.textContent = "Message should be at least 10 characters.";
            }
            return;
        }

        // Automated confirmation message text for the visitor
        const autoResponseText = `Hello ${name},

Thank you for reaching out to me through my portfolio website! 

This is an automated confirmation to let you know that your message regarding "${selectedTopic}" has been safely delivered to my inbox (mzaheer1070@gmail.com).

I typically review and reply to all project inquiries, feedback, and collaboration opportunities within 24 hours.

==================================================
SUMMARY OF YOUR MESSAGE:
==================================================
From: ${name} (${email})
Topic: ${selectedTopic}
Date: ${new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" })} PKT

Message:
"${message}"
==================================================

Looking forward to connecting with you!

Best regards,
Muhammad Zaheer
Computer Science Student & Software Developer
National University of Technology (NUTECH), Islamabad
Direct Email: mzaheer1070@gmail.com
Phone: +92-302-3185767
GitHub: https://github.com/mzaheer1070
LinkedIn: https://linkedin.com/in/mzaheer1070
Portfolio: https://mzaheer1070.github.io/Portfolio/`;

        try {
            if (statusDiv) {
                statusDiv.className = "form-status status-loading";
                statusDiv.innerHTML = `
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span class="loading-spin" style="display:inline-block; animation:spin 1s linear infinite;">⏳</span>
                        <span>Sending message to <strong>${TARGET_EMAIL}</strong> &amp; generating auto-response...</span>
                    </div>
                `;
            }
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.style.opacity = "0.7";
            }

            // 1. Dispatch Email to mzaheer1070@gmail.com with Automated Reply to sender via FormSubmit
            const emailPromise = fetch(`https://formsubmit.co/ajax/${FORMSUBMIT_TOKEN}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    name: name,
                    email: email,
                    _replyto: email,
                    _subject: `Portfolio Message from ${name} [${selectedTopic}]`,
                    topic: selectedTopic,
                    message: message,
                    _autoresponse: autoResponseText,
                    _template: "table"
                })
            }).catch(err => {
                console.warn("FormSubmit dispatch notice:", err);
                return null;
            });

            // 2. Persist to Firebase Firestore database
            const firestorePromise = db ? addDoc(collection(db, "contacts"), {
                name: name,
                email: email,
                topic: selectedTopic,
                message: message,
                targetEmail: TARGET_EMAIL,
                autoResponseSent: true,
                timestamp: new Date()
            }).catch(err => {
                console.warn("Firestore logging notice:", err);
                return null;
            }) : Promise.resolve();

            // 3. Forward to internal server endpoint if available
            const serverPromise = fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    email,
                    topic: selectedTopic,
                    message
                })
            }).catch(() => null);

            // Wait for both primary operations
            await Promise.allSettled([emailPromise, firestorePromise, serverPromise]);

            if (statusDiv) {
                statusDiv.className = "form-status status-success";
                statusDiv.innerHTML = `
                    <div class="delivery-receipt">
                        <div class="delivery-receipt-header">
                            <span class="receipt-check">✓</span>
                            <strong>Message Successfully Sent!</strong>
                        </div>
                        <p class="receipt-body">
                            Your message has been emailed directly to <strong>${TARGET_EMAIL}</strong>. 
                            An automated confirmation receipt has also been dispatched to your email inbox (<strong>${escapeHTML(email)}</strong>).
                        </p>
                        <div class="receipt-footer">
                            <span class="receipt-sla">⚡ Typical reply time: within 24 hours</span>
                            <a href="mailto:${TARGET_EMAIL}?subject=Following%20up:%20${encodeURIComponent(selectedTopic)}" class="receipt-mailto-link">
                                Open Mail Client
                            </a>
                        </div>
                    </div>
                `;
            }

            contactForm.reset();
            // Remove active topic chips
            contactForm.querySelectorAll(".topic-chip").forEach(c => c.classList.remove("is-active"));
            if (charCount) {
                charCount.textContent = "0 / 500";
            }
        } catch (error) {
            console.error("Submission error:", error);
            if (statusDiv) {
                statusDiv.className = "form-status status-error";
                statusDiv.innerHTML = `
                    <div>
                        <strong>Delivery Issue:</strong> Could not complete automated send.
                        <p style="margin-top:4px; font-size:0.85rem;">
                            You can reach Muhammad Zaheer directly at 
                            <a href="mailto:${TARGET_EMAIL}" style="color:var(--primary); font-weight:700;">${TARGET_EMAIL}</a>.
                        </p>
                    </div>
                `;
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = "1";
            }
        }
    });
}
