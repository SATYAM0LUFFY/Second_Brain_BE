import mongoose  from "mongoose";

const userSchema  = new mongoose.Schema({
    userName : {type :String , required: true} , 
    password :  {type :String , required : true},
    email : { type :String , required : true}
})

const userModel  = mongoose.model("users" , userSchema)

const contentType  = ["Youtube", "Tweet" , "Document"]

export const contentSchema  = new mongoose.Schema({
    link : {type : String },
    type : {type : String , enum : contentType  , required : true },
    title : {type : String  , required : true }, 
    userId : {type : mongoose.Types.ObjectId , ref : "users" , required : true},
    time : {type : String  ,required : true },
    tag : {type : String , enum : ["Politics" , "Productivity" , "Entertainment"] , required : true },
    discription : {type : String}
})

const contentModel  = mongoose.model("contents" , contentSchema);

const shareSchema = new mongoose.Schema({
    share : {type : String , required : true },
    link : {type : String , required : true },
    userId : {type : mongoose.Types.ObjectId , required : true  }
})

const shareModel  = mongoose.model("share" , shareSchema);


export {
    userModel,
    contentModel,
    shareModel
}
