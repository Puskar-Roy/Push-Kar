require('dotenv').config(); 
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const mime = require('mime-types');


const s3Client = new S3Client({
    region: 'ap-south-1',
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey:process.env.S3_SECRET_KEY
    }
});


const PROJECT_ID = process.env.PROJECT_ID;

async function startServer() {
    const outDir = path.join(__dirname, "output");

  
    const process = exec(`cd ${outDir} && npm install && npm run build`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing build: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`Build stderr: ${stderr}`);
        }
        console.log(`Build stdout: ${stdout}`);
      });

    process.stdout.on("data", (data) => {
        console.log(data.toString());
    });

    process.stderr.on("data", (data) => {
        console.error(`Error: ${data.toString()}`);
    });

    process.on("close", async () => {
        console.log("Build Succcessfully!");
        const distFolder = path.join(__dirname, "output", "dist");
        console.log("Build Folder - ",distFolder);
        await new Promise(resolve => setTimeout(resolve, 3000));
        if (!fs.existsSync(distFolder)) {
            console.error("Dist folder not found! Build might have failed.");
            return;
        }
        const distFolderContents = fs.readdirSync(distFolder, { recursive: true });

        for (const file of distFolderContents) {
            const filePath = path.join(distFolder, file);
            if (fs.lstatSync(filePath).isDirectory()) continue;

            console.log('Uploading', filePath);

            
            const command = new PutObjectCommand({
                Bucket: process.env.S3_NAME, 
                Key: `__outputs/${PROJECT_ID}/${file}`,
                Body: fs.createReadStream(filePath),
                ContentType: mime.lookup(filePath) || 'application/octet-stream'
            });

            try {
                await s3Client.send(command);
                console.log(`Uploaded ${file}`);
            } catch (error) {
                console.error(`Failed to upload ${file}:`, error.message);
            }
        }

        console.log("All files uploaded successfully!");
    });

    process.on("error", (err) => {
        console.error(`Failed to start process: ${err.message}`);
    });
}

startServer();
