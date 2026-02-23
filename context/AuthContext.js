import { useContext, createContext, useState, useEffect } from "react";
import { account } from "../lib/appwriteConfig.js";

// Admin credentials
const ADMIN_EMAIL = "adminboss@gmail.com";
const ADMIN_PASSWORD = "Adminboss@123";

const AuthContext = createContext();

const isUnauthenticatedError = (error) => {
    const message = error?.message?.toLowerCase?.() || "";
    return (
        message.includes("missing scopes") ||
        message.includes("guests") ||
        message.includes("unauthorized") ||
        message.includes("not found")
    );
};

const AuthProvider = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState(false);
    const [user, setUser] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        initAuth();
    }, []);

    const initAuth = async () => {
        console.log("Starting authentication initialization...");
        try {
            await checkAuth();
        } catch (error) {
            // Unexpected auth errors should not block the app.
            console.log("Initial auth check failed:", error?.message || error);
            setSession(null);
            setUser(null);
            setIsAdmin(false);
        } finally {
            console.log("Auth initialization completed");
            setLoading(false);
        }
    };

    const checkAuth = async () => {
        console.log("Checking authentication...");
        try {
            const responseSession = await account.getSession("current");
            console.log("Session found:", responseSession.$id);
            setSession(responseSession);

            const responseUser = await account.get();
            console.log("User found:", responseUser.email);
            setUser(responseUser);
            
            // Check if user is admin
            const userIsAdmin = responseUser.email === ADMIN_EMAIL;
            setIsAdmin(userIsAdmin);
            
            console.log("Auth check successful, user is admin:", userIsAdmin);
            return true;
        } catch (error) {
            if (isUnauthenticatedError(error)) {
                // Expected state when there is no active login yet.
                setSession(null);
                setUser(null);
                setIsAdmin(false);
                return false;
            }

            console.log("Auth check error:", error.message);
            setSession(null);
            setUser(null);
            setIsAdmin(false);
            throw error;
        }
    };

    const signin = async ({ email, password }) => {
        setLoading(true);
        try {
            console.log("Attempting login for:", email);
            // Create session for any user (admin or regular)
            const responseSession = await account.createEmailPasswordSession(email, password);
            setSession(responseSession);
            
            // Get user data
            const responseUser = await account.get();
            setUser(responseUser);
            
            // Check if the user is admin based on email
            setIsAdmin(responseUser.email === ADMIN_EMAIL);
            
            console.log("Login successful", responseUser.email);
            return true;
        } catch (error) {
            console.error("Login error:", error.message);
            throw error; // Rethrow to handle in the sign-in component
        } finally {
            // Always set loading to false when we're done
            setLoading(false);
        }
    };
    
    const createAccount = async ({ email, password, name }) => {
        setLoading(true);
        try {
            console.log("Attempting to create account for:", email);
            
            // Don't allow creating an account with the admin email
            if (email === ADMIN_EMAIL) {
                throw new Error("This email is reserved for administrators");
            }
            
            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Try to create the account
            await account.create('unique()', email, password, name);
            console.log("Account created successfully for:", email);
            return true;
        } catch (error) {
            console.error("Registration error:", error);
            
            // If we hit rate limits, provide more helpful information
            if (error.message && error.message.includes("Rate limit")) {
                console.log("Rate limit hit during account creation, user should wait");
            }
            
            throw error; // Rethrow to handle in component
        } finally {
        setLoading(false);
        }
    };

    const signout = async () => {
        console.log("Signing out...");
        setLoading(true);
        try {
        await account.deleteSession("current");
        setSession(null);
        setUser(null);
            setIsAdmin(false);
            console.log("Sign out successful");
        } catch (error) {
            console.error("Sign out error:", error.message);
        } finally {
        setLoading(false);
        }
    };

    const contextData = { 
        session, 
        user, 
        signin, 
        signout, 
        createAccount, 
        isAdmin,
        loading  // Expose loading state to consuming components
    };
    
    return (
        <AuthContext.Provider value={contextData}>
            {children}
        </AuthContext.Provider>
    );
};

const useAuth = () => {
    return useContext(AuthContext);
};

export { useAuth, AuthContext, AuthProvider };
