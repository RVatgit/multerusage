const exp=require('express');
const app=exp();
const multer= require('multer');
const path=require('path');
const mong=require('mongoose');
const crypto=require("crypto");
const mulgri =require("multer-gridfs-storage");
const body= require("body-parser");
const mo= require("method-override");
const grid= require("gridfs-stream");


const monuri="mongodb://localhost/seconddb";
const con=mong.createConnection(monuri);



let gfs;
//init stream
con.once('open',()=>{
    gfs=grid(con.db,mong.mongo);
    gfs.collection('uploads');
});


const storage=new mulgri({
    url:monuri,
    file:(req,file)=>{
        return new Promise((resolve,reject)=>{
            crypto.randomBytes(16,(err,buf)=>{
                if(err) reject(err);
                const filename= buf.toString('hex')+path.extname(file.originalname);
                const fileinfo={
                    filename:filename,
                    bucketName:'uploads'
                };
                resolve(fileinfo);
            });
        });
    }
});

const upload= multer({
    storage:storage
});

 


app.use(body.json());
app.use(mo('_method'));
app.use(body.urlencoded({extended:false}));


app.set('view engine', 'html');
app.engine('html', require('ejs').renderFile);

app.use(exp.static(path.join(__dirname,"public")));

app.get ('/',(req,res)=>{
    gfs.files.find().toArray((err,files)=>{
        if(!files|| !files.length){
            res.render('index',{
                files:false
            });
        }
        else{
            files.map(file=>{
                file.isImage=(file.contentType==='image/jpeg'||file.contentType==='image/png');
            });
            res.render("index",{
                files:files
            });
        }
    });
});

app.delete('/files/:id',(req,res)=>{
    gfs.remove({_id:req.params.id,root:'uploads'},(err,gs)=>{
        if(err) res.status(404).json({err:err});
        else res.redirect('/')
    });
});

app.post('/upload',upload.single('file'),(req,res)=>{
 res.redirect('/');
});

app.get ('/files',(req,res)=>{
    gfs.files.find().toArray((err,files)=>{
        if(!files|| !files.length){
            return res.status(404).json({
                err:'No files Exist'
            });
        }
        return res.json(files);
    });
});
app.get ('/files/:fn',(req,res)=>{
    gfs.files.findOne({filename:req.params.fn},(err,files)=>{
        if(!files|| !files.length){
            return res.status(404).json({
                err:'No files Exist'
            });
        }
        return res.json(files);
    });
});

app.get ('/image/:fn',(req,res)=>{
    gfs.files.findOne({filename:req.params.fn},(err,files)=>{
        //check file
        if(!files|| !files.length){
            return res.status(404).json({
                err:'No files Exist'
            });
        }
        //check mime
        if(files.contentType==='image/jpeg'||files.contentType==='image/png'){
            const readstream = gfs.createReadStream(files.filename);
            readstream.pipe(res);
        }
        else {
            res.status(404).json({
            err:'No files Exist'
            });
        }
    });
});



app.listen("3000");