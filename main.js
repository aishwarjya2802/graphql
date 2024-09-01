import { authenticateUser } from './auth.js';
import { renderUserDashboard } from './dashboard.js';

const primaryBlock = document.getElementById("main");

if (!primaryBlock) {
    console.error("Element with ID 'main' not found.");
} else {
    const storedAccessToken = localStorage.getItem('accessToken');

    if (storedAccessToken) {
        // If accessToken is found in localStorage, render the dashboard
        renderUserDashboard(storedAccessToken);
    } else {
        // No accessToken found, show the login form
        const loginContainer = document.createElement("div");
        loginContainer.className += "centerblock login";
        loginContainer.id = "authorization";
        loginContainer.innerHTML = `
            <img src="./gql.png" alt="Logo" class="login-logo">
            <form id="authenticationForm" class="centerblock">
                Username/Email: <input type="username" id="username" name="username" required/><br>
                Password: <input type="password" id="password" name="password" required/><br>
                <input type="submit" value="Login">
            </form>
        `;
        primaryBlock.appendChild(loginContainer);

        const authForm = document.getElementById("authenticationForm");

        if (!authForm) {
            console.error("Form with ID 'authenticationForm' not found.");
        } else {
            // Handle form submission and Enter key press
            authForm.addEventListener('keypress', function(event) {
                if (event.key === 'Enter') {
                    handleFormInput();
                }
            });

            authForm.addEventListener('submit', function(event) {
                event.preventDefault(); 
                handleFormInput();
            });

            // Function to handle form input
            async function handleFormInput() {
                const formElement = document.getElementById("authenticationForm");
                const authDivElement = document.getElementById("authorization");
                const formData = new FormData(formElement);
                const userField = formData.get("username");
                const passField = formData.get("password");

                let accessToken = await authenticateUser(userField, passField);

                if (!accessToken) {
                    let errorElement = document.createElement('div');
                    errorElement.id = 'errorMessage';
                    errorElement.className += "centerblock error";
                    errorElement.innerHTML = `
                    <div class="centerBlock"><br>
                    <p style="color:red;">The username or password is incorrect. Try again.</p>
                    </div>
                    `;
                    authDivElement.insertAdjacentElement('afterend', errorElement);
                    document.getElementById("authenticationForm").reset();
                } else {
                    localStorage.setItem('accessToken', accessToken);
                    renderUserDashboard(accessToken);
                } 
            }
        }
    }
}

