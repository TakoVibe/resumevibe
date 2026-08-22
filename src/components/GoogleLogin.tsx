import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { toast } from "react-hot-toast";

const GOOGLE_CLIENT_ID = import.meta.env.PUBLIC_GOOGLE_CLIENT_ID;

declare global {
    interface Window {
        google: any;
        handleCredentialResponse: (response: any) => Promise<void>;
    }
}

export function GoogleLogin() {
    const { user, login } = useAuth();
    // Use isDarkTheme logic if needed, or pass as prop
    const buttonRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (user) return;

        const loadGoogleScript = () => {
            const scriptId = "google-gsi-client";
            const existingScript = document.getElementById(scriptId);

            if (!existingScript) {
                const script = document.createElement("script");
                script.id = scriptId;
                script.src = "https://accounts.google.com/gsi/client";
                script.async = true;
                script.defer = true;
                script.onload = initializeGoogleSignIn;
                document.body.appendChild(script);
            } else {
                initializeGoogleSignIn();
            }
        };

        const initializeGoogleSignIn = () => {
            if (window.google && buttonRef.current) {
                // Determine theme based on system preference or prop
                // For now, we force a specific look that works with the dark modal

                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: async (response: any) => {
                        try {
                            if (!response.credential) {
                                console.error("Google login failed");
                                toast.error("Google login failed. Please try again.");
                                return;
                            }
                            const res = await api.post("/api/users/google/", {
                                code: response.credential
                            });

                            if (res.ok) {
                                const data = await res.json();
                                login(data.data.auth_token, data.data.user);
                                toast.success("Successfully logged in!");
                            } else {
                                console.error("Authentication failed");
                                toast.error("Login failed. Please try again.");
                            }
                        } catch (error) {
                            console.error("Authentication error:", error);
                            toast.error("An error occurred. Please try again.");
                        }
                    },
                    auto_select: false,
                    cancel_on_tap_outside: true,
                });

                window.google.accounts.id.renderButton(
                    buttonRef.current,
                    {
                        theme: "outline",
                        size: "large",
                        type: "standard",
                        shape: "rectangular",
                        text: "continue_with",
                        logo_alignment: "left",
                        width: 300
                    }
                );
            }
        };

        // Check if script is already loaded
        if (typeof window.google !== 'undefined') {
            initializeGoogleSignIn();
        } else {
            loadGoogleScript();
        }

    }, [user, login]);

    if (user) return null;

    return <div ref={buttonRef} className="flex justify-center"></div>;
}
