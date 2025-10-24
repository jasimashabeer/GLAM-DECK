const User=require('../../models/userSchema')

const customerBlocked=async(req,res)=>{
    try{
        let id=req.query.id
        const page=req.query.page //adding
        await User.updateOne({_id:id},{$set:{isBlocked:true}})
        res.redirect(`/admin/users?page=${page}`)
    }
    catch(error){
        res.redirect("/pageError")
    }
    
}

const customerunBlocked=async(req,res)=>{
    try{
        let id=req.query.id
        const page=req.query.page //adding
        await User.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect(`/admin/users?page=${page}`)
    }
    catch(error){
        res.json('error')
    }
    
}

module.exports={customerBlocked, customerunBlocked}