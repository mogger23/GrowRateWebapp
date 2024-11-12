// public/script.js

document.addEventListener("DOMContentLoaded", function() {
    // Determine which page is loaded
    const path = window.location.pathname.split("/").pop();

    switch (path) {
        case 'onboarding.html':
            initializeOnboarding();
            break;
        case 'index.html':
        case '':
            initializeUpload();
            break;
        default:
            // Do nothing for other pages
            break;
    }
});

/**
 * Initialize Onboarding Functionality
 */
function initializeOnboarding() {
    let currentStep = 1;
    const totalSteps = 3;
    const onboardingData = {};

    /**
     * Handle the onboarding form navigation and submission.
     */
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');
    const submitOnboardingBtn = document.getElementById('submit-onboarding-btn');
    const onboardingForm = document.getElementById('onboarding-form');

    if (nextBtn && prevBtn && submitOnboardingBtn && onboardingForm) {
        nextBtn.addEventListener('click', () => {
            const currentStepElement = document.querySelector(`.question-step[data-step="${currentStep}"]`);
            const inputElements = currentStepElement.querySelectorAll('input, select');
            let valid = true;

            // Validate current step inputs
            inputElements.forEach(input => {
                if (!input.checkValidity()) {
                    valid = false;
                    input.reportValidity();
                }
            });

            if (valid) {
                // Save data
                inputElements.forEach(input => {
                    onboardingData[input.name] = input.value.trim();
                });

                if (currentStep < totalSteps) {
                    currentStep++;
                    updateOnboardingSteps();
                }
            }
        });

        prevBtn.addEventListener('click', () => {
            if (currentStep > 1) {
                currentStep--;
                updateOnboardingSteps();
            }
        });

        /**
         * Update the onboarding steps display and progress bar.
         */
        function updateOnboardingSteps() {
            // Hide all steps
            document.querySelectorAll('.question-step').forEach(step => {
                step.classList.remove('active');
            });

            // Show current step
            const currentStepElement = document.querySelector(`.question-step[data-step="${currentStep}"]`);
            currentStepElement.classList.add('active');

            // Update progress bar
            const progressPercentage = ((currentStep - 1) / totalSteps) * 100;
            const progressBarFill = document.getElementById('progress-bar-fill');
            if (progressBarFill) {
                progressBarFill.style.width = `${progressPercentage}%`;
            }

            // Show/hide navigation buttons
            if (currentStep === 1) {
                prevBtn.style.display = 'none';
            } else {
                prevBtn.style.display = 'inline-block';
            }

            if (currentStep === totalSteps) {
                nextBtn.style.display = 'none';
                submitOnboardingBtn.style.display = 'inline-block';
                if (progressBarFill) {
                    progressBarFill.style.width = '100%';
                }
            } else {
                nextBtn.style.display = 'inline-block';
                submitOnboardingBtn.style.display = 'none';
            }
        }

        /**
         * Handle the onboarding form submission.
         */
        onboardingForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const currentStepElement = document.querySelector(`.question-step[data-step="${currentStep}"]`);
            const inputElements = currentStepElement.querySelectorAll('input, select');
            let valid = true;

            // Validate current step inputs
            inputElements.forEach(input => {
                if (!input.checkValidity()) {
                    valid = false;
                    input.reportValidity();
                }
            });

            if (valid) {
                // Save data
                inputElements.forEach(input => {
                    onboardingData[input.name] = input.value.trim();
                });

                // Send onboarding data to server
                sendOnboardingData();
            }
        });

        /**
         * Send the onboarding data to the server and initiate Stripe Checkout.
         */
        async function sendOnboardingData() {
            try {
                const response = await fetch('/onboarding', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(onboardingData)
                });

                const data = await response.json();

                if (response.ok) {
                    console.log('Onboarding Data:', onboardingData);
                    // Initiate Stripe Checkout
                    initiateStripeCheckout();
                } else {
                    alert(data.error || 'An error occurred during onboarding.');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred during onboarding.');
            }
        }

        /**
         * Initiate Stripe Checkout by requesting a session from the server.
         */
        async function initiateStripeCheckout() {
            try {
                const response = await fetch('/create-checkout-session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();

                if (response.ok) {
                    // Redirect to Stripe Checkout
                    window.location.href = data.url;
                } else {
                    alert(data.error || 'Failed to initiate payment.');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Failed to initiate payment.');
            }
        }

        /**
         * Initialize the onboarding by setting up the form.
         */
        function initialize() {
            updateOnboardingSteps();
        }

        initialize();
    } // End of initializeOnboarding function

    /**
     * Initialize Upload Functionality
     */
    function initializeUpload() {
        /**
         * Show success message (if needed)
         */
        const successMessage = document.getElementById('success-message');
        if (successMessage) {
            successMessage.classList.add('show');
        }

        /**
         * Enable the file upload input
         */
        const fileInput = document.getElementById('file-upload');
        if (fileInput) {
            fileInput.disabled = false;
        }

        /**
         * Show the submit button
         */
        const submitBtn = document.getElementById('submit-btn');
        if (submitBtn) {
            submitBtn.style.display = 'inline-block';
        }

        /**
         * Preview the selected image (Optional)
         */
        window.previewImage = function(event) {
            const file = event.target.files[0];
            if (file) {
                window.selectedFile = file;
                // Optional: Implement image preview
                const reader = new FileReader();
                reader.onload = function(e) {
                    const preview = document.createElement('img');
                    preview.src = e.target.result;
                    preview.style.maxWidth = '100%';
                    preview.style.marginTop = '20px';
                    const uploadBox = document.querySelector('.upload-box');
                    // Remove any existing preview
                    const existingPreview = uploadBox.querySelector('img');
                    if (existingPreview) {
                        uploadBox.removeChild(existingPreview);
                    }
                    uploadBox.appendChild(preview);
                }
                reader.readAsDataURL(file);
            }
        }

        /**
         * Send the uploaded image to the backend for processing and retrieve the rating.
         */
        window.describeImage = async function() {
            const selectedFile = window.selectedFile;
            if (!selectedFile) {
                alert('Please select an image to upload.');
                return;
            }

            const formData = new FormData();
            formData.append('image', selectedFile);

            try {
                // Show loading state
                const button = document.getElementById('submit-btn');
                if (button) {
                    button.disabled = true;
                    button.textContent = 'Processing...';
                }

                // Send the image to the backend for preprocessing and scoring
                const response = await fetch('/describe', { // Use relative path since front-end is served by back-end
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (response.ok) {
                    // Parse the comma-separated numbers
                    const [firstNumber, secondNumber] = data.score.split(',').map(Number);

                    // Get the category information
                    const { title, straightTalk, steamyStuff, bgClass } = getCategoryInfo(secondNumber);

                    // Set the category title and rating
                    const resultTitle = document.getElementById('result-title');
                    const ratingNumber = document.getElementById('rating-number');
                    const straightTalkDiv = document.getElementById('straight-talk');
                    const steamyStuffDiv = document.getElementById('steamy-stuff');

                    if (resultTitle) resultTitle.textContent = title;
                    if (ratingNumber) ratingNumber.textContent = firstNumber;

                    // Set the descriptions
                    if (straightTalkDiv) {
                        straightTalkDiv.innerHTML = `<strong>The Straight Talk:</strong> ${straightTalk}`;
                    }
                    if (steamyStuffDiv) {
                        steamyStuffDiv.innerHTML = `<strong>The Steamy Stuff:</strong> ${steamyStuff}`;
                    }

                    // Apply the background based on the title
                    const resultContainer = document.getElementById('result-container');
                    if (resultContainer) {
                        resultContainer.className = `result-container ${bgClass}`;
                    }

                    // Hide the upload screen and show the results screen
                    const container = document.querySelector('.container');
                    const resultScreen = document.getElementById('result-screen');

                    if (container) container.style.display = 'none';
                    if (resultScreen) resultScreen.style.display = 'block';
                } else {
                    alert(data.error || 'An error occurred while processing your image.');
                }

            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred while processing your image.');
            } finally {
                // Reset button state
                const button = document.getElementById('submit-btn');
                if (button) {
                    button.disabled = false;
                    button.textContent = 'Submit Image for Rating';
                }
            }
        }

        /**
         * Retrieve category information based on the rating number.
         * @param {number} number - The rating number to determine the category.
         * @returns {object} - An object containing title, descriptions, and background class.
         */
        function getCategoryInfo(number) {
            if (number >= 0 && number <= 20) {
                return {
                    title: "Tiny Serpent",
                    straightTalk: "A thin, wiry creature that slithers about like a snake in the grass. It's quick to hide but delicate in its movements. Small in stature, yet swift and nimble, it's the kind of serpent that moves fast but leaves little behind.",
                    steamyStuff: "Oh honey, it's small, but it's got a charm all its own. It sneaks up on you, light as a feather, with a soft and tender touch. You may not feel the weight, but the sensation is enough to send shivers down your spine, if only for a moment.",
                    bgClass: "tiny-serpent-bg"
                };
            } else if (number >= 21 && number <= 40) {
                return {
                    title: "Pencil Pusher",
                    straightTalk: "Straight and narrow, this one’s got the precision of a pen on paper. Thin but determined, it knows its path and doesn’t waver. Don’t expect it to take up much space, but it’s more than ready to make its mark.",
                    steamyStuff: "It’s slender, yet confident. It slides in like a whisper but lingers just long enough to leave a trace. You might not expect it to fill you up, but it knows just where to hit, drawing lines on your body like it’s writing poetry.",
                    bgClass: "pencil-pusher-bg"
                };
            } else if (number >= 41 && number <= 60) {
                return {
                    title: "Average Avocado",
                    straightTalk: "A solid, standard contender with the bulk to satisfy but nothing that’ll overwhelm. It’s smooth, round, and easygoing, with enough weight to make its presence known. The middle ground where form meets function.",
                    steamyStuff: "Firm and filling in just the right way, it’s the kind that’s a pleasure to hold. It fills you up just enough without ever crossing into uncomfortable territory. You’ll leave feeling content and more than a little pleased.",
                    bgClass: "average-avocado-bg"
                };
            } else if (number >= 61 && number <= 80) {
                return {
                    title: "Banana Bender",
                    straightTalk: "A thick, curved creation with a wild side. It’s got a bend to it that keeps things interesting, thick enough to feel in every corner. It’s the kind of banana that takes its time, bending to meet your every need.",
                    steamyStuff: "It’s thick, it’s curved, and it knows how to hit every spot just right. It fills you up, curving in deep with every push, making you gasp for more. You’ll be gripping onto the sheets and begging for it to stay just a little longer.",
                    bgClass: "banana-bender-bg"
                };
            } else if (number >= 81 && number <= 90) {
                return {
                    title: "Chub Cannon",
                    straightTalk: "This cannon comes loaded and ready to fire. Thick as a brick and straight as an arrow, it’s the kind that demands attention. No frills, just pure, solid mass that hits you like a wave and keeps on coming.",
                    steamyStuff: "It’s big, thick, and relentless. When it’s in, you know it’s there, and it doesn’t leave room for anything else. It’s all-consuming, pushing deeper with every thrust until you’re left gasping, your body full, your mind blown.",
                    bgClass: "chub-cannon-bg"
                };
            } else if (number >= 91 && number <= 100) {
                return {
                    title: "King Cobra",
                    straightTalk: "The King Cobra reigns supreme, large and imposing, thick as a tree trunk with a dangerous allure. When it rises, all attention is on it, filling the room with its powerful presence. It’s the apex predator of the serpent world.",
                    steamyStuff: "You’ll feel every inch of its dominance as it slides in, slowly at first, stretching you wide. It fills you completely, taking over your senses until there’s nothing left but the feeling of pure, primal power. You’ll be left shaking, satisfied beyond belief.",
                    bgClass: "king-cobra-bg"
                };
            }
            return {
                title: "Unknown",
                straightTalk: "No straight talk available.",
                steamyStuff: "No steamy stuff available.",
                bgClass: ""
            };
        }
    }
}
