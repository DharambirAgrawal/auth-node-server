

export const registerMiddleware=(req,res,next)=>{

    const {token} =req.params

    if(!token){
        next()
    }

    console.log('llllllllllllllll')
    next()
}