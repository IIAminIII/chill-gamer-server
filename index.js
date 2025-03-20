const express = require('express');
const cors = require('cors');
const port =  process.env.PORT || 5000;
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

app.use(cors());
app.use(express.json());


app.listen(port,(req,res)=>{
    console.log(`Server is running on port ${port}`);
});



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ylf2c.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");

    const reviewCollection = client.db("chillGamerDB").collection("reviews");

    const wishListCollection = client.db("chillGamerDB").collection("WishList");

    app.get('/allReviews',async(req,res)=>{
        const query = reviewCollection.find();
        const result = await query.toArray();
        res.send(result);
    })

    app.get('/getReview/:id',async(req,res)=>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const result = await reviewCollection.findOne(query);
        res.send(result);
    })

    app.post('/addReview',async(req,res)=>{
        const review = req.body;
        const result = await reviewCollection.insertOne(review);
        res.send(result);
    })

    app.get('/myReview/:email',async(req,res)=>{
        const email = req.params.email;
        const query = {userEmail: email};
        const result = await reviewCollection.find(query).toArray();
        res.send(result);
    })

    app.delete('/deleteReview/:id',async(req,res)=>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const result = await reviewCollection.deleteOne(query);
        res.send(result);
    })

    app.put('/updateReview/:id',async(req,res)=>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const updatedReview = req.body;
        const updateDoc = {
            $set: {
                title: updatedReview.title,
                description: updatedReview.description,
                rating: updatedReview.rating,
                publishingYear: updatedReview.publishingYear,
                genre: updatedReview.genre,
                coverImage: updatedReview.coverImage,
            }
        }
        const result = await reviewCollection.updateOne(query,updateDoc);
        res.send(result);
    })


    app.post('/addToWishList', async (req, res) => {
        try {
            const { email, gameId } = req.body;
            
    
            if (!email || !gameId) {
                return res.status(400).json({ error: "Email and Game ID are required." });
            }
    
            const game = await reviewCollection.findOne({ _id: new ObjectId(gameId) });
    
            if (!game) {
                return res.status(404).json({ error: "Game not found." });
            }
    
            const userWishlist = await wishListCollection.findOne({ email });
    
            if (userWishlist) {

                const isAlreadyInWishlist = userWishlist.wishList.some(
                    (wishlistGame) => wishlistGame._id.toString() === game._id.toString()
                );
    
                if (isAlreadyInWishlist) {
                    return res.status(400).json({ message: "Game is already in your wishlist." });
                }
                const result = await wishListCollection.updateOne(
                    { email },
                    { $push: { wishList: game } }
                );
                return res.status(200).json({ message: "Game added to wishlist.", result });
            } else {
                const newWishlist = {
                    email,
                    wishList: [game],
                };
                const result = await wishListCollection.insertOne(newWishlist);
                return res.status(201).json({ message: "Wishlist created and game added.", result });
            }
        } catch (error) {
            console.error("Error adding game to wishlist:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });
    
    
    app.get('/getWishList/:email', async (req, res) => {
        try {
            const email = req.params.email;
            const result = await wishListCollection.findOne({ email });
    
            if (!result) {
                return res.status(404).json({ message: "No wishlist found for this user." });
            }
    
            res.status(200).json(result.wishList);
        } catch (error) {
            console.error("Error fetching wishlist:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });
    

    app.delete('/removeFromWishlist/:gameId', async (req, res) => {
        try {
            const { gameId } = req.params;  
            const email = req.body.email;  
            const userWishlist = await wishListCollection.findOne({ email });
            if (!userWishlist) {
                return res.status(404).json({ error: "Wishlist not found for this user." });
            }
            const result = await wishListCollection.updateOne(
                { email },
                { $pull: { wishList: { _id: new ObjectId(gameId) } } }  
            );
            if (result.modifiedCount > 0) {
                res.status(200).json({ message: "Game removed from wishlist.", deletedCount: result.modifiedCount });
            } else {
                res.status(400).json({ message: "Failed to remove the game from wishlist." });
            }
        } catch (error) {
            console.error("Error removing game from wishlist:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });
    
app.get('/highestRatedGames', async (req, res) => {
    try {
        const highestRatedGames = await reviewCollection
            .find()
            .sort({ rating: -1 }) 
            .limit(6)  
            .toArray();

        res.status(200).json(highestRatedGames);
    } catch (error) {
        console.error("Error fetching highest rated games:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});



  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
