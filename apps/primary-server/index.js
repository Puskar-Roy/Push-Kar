const express = require('express');
const { generateSlug } = require('random-word-slugs');
const { ECSClient, RunTaskCommand } = require('@aws-sdk/client-ecs');
require('dotenv').config();

const app = express()
const PORT = process.env.PORT;

app.use(express.json());

const ecsClient = new ECSClient({
    region: process.env.ECS_REGION,
    credentials: {
        accessKeyId: process.env.ECS_ACCESS_KEY,
        secretAccessKey: process.env.ECS_SECRET_KEY
    }
})

const conifg = {
    CLUSTER: process.env.CLUSTER,
    TASK: process.env.TASK,
    IMAGE: process.env.IMG_NAME,
    SUBNET1: process.env.SUBNET1,
    SUBNET2: process.env.SUBNET2,
    SUBNET3: process.env.SUBNET3,
    SEC_GRP:process.env.SEC_GRP
}


app.post('/project', async (req, res) => {
    const projectSlug = generateSlug();
    const { gitURL } = req.body;

    const command = new RunTaskCommand({
        cluster: conifg.CLUSTER,
        taskDefinition: conifg.TASK,
        launchType: "FARGATE",
        count: 1,
        networkConfiguration: {
            awsvpcConfiguration: {
                assignPublicIp: "ENABLED",
                subnets: [conifg.SUBNET1, conifg.SUBNET2, conifg.SUBNET3],
                securityGroups: [conifg.SEC_GRP]
            }
        },
        overrides: {
            containerOverrides: [
                {
                    name: conifg.IMAGE,
                    environment: [
                        { name: 'GIT_REPOSITORY__URL', value: gitURL },
                        { name: 'PROJECT_ID', value: projectSlug }
                    ]
                }
            ]
        }


    });

    try{
    await ecsClient.send(command);
    } catch(e){
        return res.json({ status: 'failed', data: { error: e } })
    }    
    return res.json({ status: 'queued', data: { projectSlug, url: `http://${projectSlug}.push-kar.vercel.app` } })

})

app.listen(PORT, () => console.log(`Reverse Proxy Running..${PORT}`))
