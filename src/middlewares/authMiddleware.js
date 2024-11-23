

export const registerMiddleware=(req,res,next)=>{

    const {token} =req.params
    console.log(token)

    if(!token){
        next()
    }

    console.log('llllllllllllllll')
    next()
}