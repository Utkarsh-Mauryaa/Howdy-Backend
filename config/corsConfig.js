const corsOptions = {
    origin: [
        "http://localhost:5173",
        "http://localhost:4173", 
        "https://howdy-frontend-1zs1.vercel.app"
    ],
    methods: ["GET","POST","PUT","DELETE"],
    credentials: true
}

const HOWDY_TOKEN = "howdy-token";
export {corsOptions, HOWDY_TOKEN}