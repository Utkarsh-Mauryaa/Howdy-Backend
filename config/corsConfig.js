const corsOptions = {
    origin: [
        "http://localhost:5173",
        "http://localhost:4173", 
    ],
    methods: ["GET","POST","PUT","DELETE"],
    credentials: true
}

const HOWDY_TOKEN = "howdy-token";
export {corsOptions, HOWDY_TOKEN}