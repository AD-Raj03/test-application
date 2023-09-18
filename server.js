const mongoose = require("mongoose");
const express = require("express");
const multer = require("multer");
const ejs = require("ejs");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const bodyParser = require("body-parser");
const cors = require('cors');
const router = express.Router();
const nodemailer = require('nodemailer');
const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors());
app.use('/api', router);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
    session({
        secret: "test-application",
        resave: false,
        saveUninitialized: true,
    })
);

mongoose.connect(
    "mongodb+srv://root:root@cluster0.rvhpgmj.mongodb.net/?retryWrites=true&w=majority",
    {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }
);

const storage = multer.diskStorage({
    destination: "./public/uploads/",
    filename: (req, file, callback) => {
        const imageFiles = fs.readdirSync("./public/uploads/");
        let imageCount = imageFiles.length;

        while (fs.existsSync(`./public/uploads/image${imageCount + 1}.jpg`)) {
            imageCount++;
        }

        const filename = `image${imageCount + 1}.jpg`;
        callback(null, filename);
    },
});

const upload = multer({
    storage: storage,
});

app.use(express.static("public"));
app.set("view engine", "ejs");

app.get("/upload", (req, res) => {
    res.render("upload");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/addquestionpaper", (req, res) => {
    res.render("addquestionpaper");
});




app.get("/", (req, res) => {
    res.redirect("/testmaster/api/questionpapers");
});

const questionSchema = new mongoose.Schema({
    questionId: {
        type: Number,
        default: 1000,
        unique: true,
    },
    questionTitle: String,
    questionDescription: String,
    questionDifficulty: String,
    image: String,
    correctOptions: [String],
    questionType: String,
    questionTags: String,
    options: [
        {
            text: String,
            isCorrect: Boolean,
        },
    ],
});

const Question = mongoose.model("Question", questionSchema);

const user = new mongoose.Schema({
    username: String,
    password: String,
});

const User = mongoose.model("User", user);

const candidateSchema = new mongoose.Schema({
    name: String,
    email: String,
    securityCode: Number,
    examDate: Date,
    questionPaperId: String,
    isActive: Boolean,
});

const Candidate = mongoose.model("Candidate", candidateSchema);

const responseSchema = new mongoose.Schema({
    testName: String,
    name: String,
    emailId: String,
    testDate: String,
    testDuration: String,
    startTime: String,
    endTime: String,
    timeTaken: String,
    responses: [
        {
            questionId: Number,
            selectedOptions: [String],
        },
    ],
});

const Response = mongoose.model("Response", responseSchema);

const resultSchema = new mongoose.Schema({
    testName: String,
    name: String,
    emailId: String,
    testDate: String,
    testDuration: String,
    startTime: String,
    endTime: String,
    timeTaken: String,
    currentStatus: String,
    totalQuestion: Number,
    attemptedQuestoin: Number,
    correctCount: Number,
    wrongCount: Number,
    skippedQuestions: Number,
    result: String,
});

const Result = mongoose.model("Result", resultSchema);



const questionPaperSchema = new mongoose.Schema({
    questionPaperTitle: String,
    description: String,
    minimumNumberForPassing: Number,
    questionIds: [Number],
});

const QuestionPaper = mongoose.model('QuestionPaper', questionPaperSchema);

// const transporter = nodemailer.createTransport({
//     service: 'Gmail',
//     auth: {
//         user: 'sandeep.cdac.sep.2209@gmail.com', // Your email address
//         pass: 'random'   // Your email password or an app-specific password
//     }
// });

//-------------------------------------------------
// Route to display the candidate login form
app.get('/testmaster/exam', (req, res) => {
    res.render('candidatelogincopy'); // Assuming you have a "login.ejs" template
  });
//------------------------------------------------
// Route to verify and update the candidate and get question data
app.post('/testmaster/api/exam', async (req, res) => {
    try {
      const { email, securityCode } = req.body;
  
    //   console.log(email, securityCode);
      const candidate = await Candidate.findOne({
        email,
        securityCode,
        isActive: true, // Make sure the candidate is active
      });
      if (candidate) {
        console.log('verified')
      }
  
      if (!candidate) {
        return res.status(404).json({ message: 'Candidate not found or not active.' });
      }
  
      const questionPaperId = candidate.questionPaperId;
  
      //console.log(questionPaperId);

      const questionPaper = await QuestionPaper.findOne({ _id: questionPaperId });

       //console.log(questionPaper)
  
      if (!questionPaper) {
        return res.status(404).json({ message: 'Question paper not found.' });
      }
  
      const questionIds = questionPaper.questionIds;
  
       //console.log(questionIds)

      
      const questions = await Question.find({ questionId: { $in: questionIds } });
  
      // console.log(questions)

      const questionData = questions.map(question => {

        const options = question.options.map(option => {
            // Create a new option object with only the 'text' property
            return { text: option.text };
          });
        return {
           questionId: question.questionId,
          questionTitle: question.questionTitle,
           questionDescription: question.questionDescription,
          image: question.image,
          
          questionType: question.questionType,
           questionTags: question.questionTags,
          options: options,
        };
      });
      
      
      // Update the candidate to set isActive to false
     // await Candidate.findByIdAndUpdate(candidate._id, { isActive: false });
  
      // Return the question data
      res.render('exampapercopy', {questionData} );  // Assuming you have an "exampape" EJS template
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  });
  
//------------------------------------------------

app.post("/testmaster/api/candidates/:questionPaperId", async (req, res) => {
    try {
        
        const securityCode = Math.floor(100000 + Math.random() * 900000);

       
        const {name, email, examDate } = req.body;

       
        const { questionPaperId } = req.params;

       
        const candidate = new Candidate({
            name,
            email,
            securityCode,
            examDate,
            questionPaperId,
            isActive: true,
        });

        await candidate.save();

        // const mailOptions = {
        //     from: 'sandeep.cdac.sep.2209@gmail.com', 
        //     to: email,
        //     subject: 'Your Security Code',
        //     text: `Hello ${name}, your security code is: ${securityCode}`
        // };

        // transporter.sendMail(mailOptions, (error, info) => {
        //     if (error) {
        //         console.error("Error sending email:", error);
        //         res.status(500).json({ success: false, message: "Internal server error" });
        //     } else {
        //         console.log("Email sent:", info.response);
        //         res.status(201).json({ success: true, message: "Candidate data saved successfully" });
        //     }
        // });

        res.status(201).json({ success: true, message: "Candidate data saved successfully" });
    } catch (error) {
        console.error("Error saving candidate data:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

app.get('/testmaster/api/candidates/:questionPaperId', (req, res) => {
    try {
       
        const { questionPaperId } = req.params;

        res.render('candidateregistration', { questionPaperId });
    } catch (error) {
        console.error('Error rendering candidate registration page:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});


// candidate credential verification api
app.post("/candidate-login", async (req, res) => {
    const { email, securityCode } = req.body;
    console.log(email, securityCode);

    try {
        const candidate = await Candidate.findOne({ email, securityCode });

        if (candidate.isActive) {

             await Candidate.findOneAndUpdate({ email: candidate.email }, { isActive: false });
            res.redirect("/testmaster/api/exampaper");
        } else {
            res.status(400).json({ success: false, message: "Please enter correct email and security code" });
        }
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

app.post("/testmaster/api/save-response", async (req, res) => {
    const {
        testName,
        name,
        emailId,
        testDate,
        testDuration,
        startTime,
        endTime,
        responses,
    } = req.body;

    console.log('1..........responses',responses);
   

    const currentTestDate = new Date(testDate);
    const day = currentTestDate.getDate();
    const month = currentTestDate.getMonth() + 1;
    const year = currentTestDate.getFullYear();

    const formattedTestDate = `${day}/${month}/${year}`;

    const timeDuration = endTime - startTime;
    const minutes = Math.floor(timeDuration / (1000 * 60));
    const seconds = Math.floor((timeDuration % (1000 * 60)) / 1000);
    // formating "mm:ss"
    const formattedTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;
    const totalQuestion = responses.length;
    // console.log(totalQuestion);
    const receivedStartTime = new Date(req.body.startTime);

    const startTimeForFormatting = new Date(parseInt(startTime, 10));
    const localTimeString = startTimeForFormatting.toLocaleString();
    const formattedStartTime = await formatTime(localTimeString);
    // console.log("formattedStartTime",formattedStartTime);

    const formattedEndTime = await formatTime(endTime)
  
    //console.log(attemptedQuestion);
    const responseDocument = new Response({
        testName,
        name,
        emailId,
        testDate: formattedTestDate,
        testDuration,
        startTime: formattedStartTime,
        endTime: formattedEndTime,
        timeTaken: formattedTime,
        responses,
    });



    try {
        await responseDocument.save();

        const attemptedQuestion = await incrementAttemptedQuestion(emailId);
        const correctCount = await calculateResult(emailId);
        const wrongCount = attemptedQuestion - correctCount;
        const skippedQuestions = totalQuestion - attemptedQuestion;
        let result = '';
        if (correctCount >= 2) {
            result = 'Pass';
        } else {
            result = 'fail';
        }
        const resultData = {
            testName: testName,
            name: name,
            emailId: emailId,
            testDate: formattedTestDate,
            testDuration: testDuration,
            startTime: formattedStartTime,
            endTime: formattedEndTime,
            timeTaken: formattedTime,
            currentStatus: 'Completed',
            totalQuestion: totalQuestion,
            attemptedQuestoin: attemptedQuestion,
            correctCount: correctCount,
            wrongCount: wrongCount,
            skippedQuestions: skippedQuestions,
            result: result,
        };

        saveResult(resultData);


        res.status(200).json({ success: true, response: responseDocument });
    } catch (error) {
        console.error("Error saving response:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

async function formatTime(date) {
    const now = new Date(date);
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    return `${hours}:${minutes}:${seconds}`;
}


async function incrementAttemptedQuestion(emailId) {
    try {

        const responses = await Response.find({ emailId });

        let attemptedQuestionCount = 0;
        responses.forEach((response) => {
            response.responses.forEach((questionResponse) => {
                if (questionResponse.selectedOptions && questionResponse.selectedOptions.length > 0) {
                    attemptedQuestionCount++;
                }
            });
        });

        console.log(`Attempted questions count for ${emailId}: ${attemptedQuestionCount}`);

        return attemptedQuestionCount;
    } catch (error) {
        console.error('Error incrementing attemptedQuestion count:', error);
        throw error;
    }
}



async function calculateResult(emailId) {
    try {
        const responseData = await Response.findOne({ emailId });
       // console.log('response data',responseData)

        if (!responseData || !responseData.responses || !Array.isArray(responseData.responses)) {
            console.warn(`Invalid response data for emailId ${emailId}.`);
            return 0;
        }

        let correctAnswer = 0;


        for (const response of responseData.responses) {
            try {

                const question = await Question.findOne({ questionId: response.questionId });
                //console.log('question fetched with question ids from response collections',question)

                if (!question) {
                    console.warn(`Question with ID ${response.questionId} not found.`);
                    continue;
                }


                const correctOptions = question.correctOptions.sort();
                console.log('correctOptions',correctOptions);
                const selectedOptions = response.selectedOptions.sort();
                console.log('selectedOptions',selectedOptions)

                if (JSON.stringify(correctOptions) === JSON.stringify(selectedOptions)) {
                    correctAnswer++;
                }
            } catch (error) {
                console.error('Error calculating result:', error);
            }
        }

        console.log(`Correct questions count for ${emailId}: ${correctAnswer}`);
        return correctAnswer;
    } catch (error) {
        console.error('Error fetching response data:', error);
        throw error;
    }
}




async function saveResult(data) {
    try {

        const result = new Result(data);


        await result.save();

        console.log('Result saved successfully');
    } catch (error) {
        console.error('Error saving result:', error);
    }
}

app.get('/results', async (req, res) => {
    try {

        const results = await Result.find().sort({ endTime: -1 });

        res.render('result', { results , req});
    } catch (error) {
        console.error('Error fetching results:', error);
        res.status(500).send('Internal Server Error');
    }
});


app.get("/thank-you", (req, res) => {
    if (req.session.thankYouShown) {
        return res.render("thank-you");
    }
    req.session.thankYouShown = true;
    res.render("thank-you");
});

app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    const user = await User.findOne({ username, password });

    if (user) {
        res.render("upload");
    } else {
        res
            .status(401)
            .json({ success: false, message: "Invalid username or password" });
    }
});

app.post("/upload", upload.single("image"), async (req, res) => {
    const questionData = JSON.parse(req.body.questionData);

    const imageFileName = req.file.filename;

    const latestQuestion = await Question.findOne().sort({ questionId: -1 });
    let newQuestionId = 1000;

    if (latestQuestion) {
        newQuestionId = latestQuestion.questionId + 1;
    }

    const options = [];
    const correctOptions = [];
    questionData.options.forEach((option) => {
        if (option.isCorrect) {
            correctOptions.push(option.text);
        }
    });
    options.push(questionData.options);

    const newQuestion = new Question({
        questionId: newQuestionId,
        questionTitle: questionData.questionTitle,
        questionDescription: questionData.questionDescription,
        questionDifficulty : questionData.questionDifficulty,
        correctOptions: correctOptions,
        image: imageFileName,
        questionType: questionData.questionType,
        questionTags: questionData.questionTags,
        options: questionData.options,
    });

    try {
        await newQuestion.save();
        res
            .status(200)
            .json({ success: true, message: "Question created successfully!" });
    } catch (error) {
        console.error("Error saving question:", error);
        res.status(500).send("Error saving question");
    }
});



app.get('/testmaster/api/edit-question/:questionId', async (req, res) => {
    try {
        const questionId = req.params.questionId;
        

        const questionData = await Question.findOne({ questionId });
        console.log(questionData._id)
        if (!questionData) {

            return res.status(404).json({ message: "Question not found" });
        }


        res.render('editquestions', { questionData });
    } catch (error) {
        console.error("Error fetching question data:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});


app.post('/testmaster/api/update-question/:questionId',upload.single("image"), async (req, res) => {
    try {
        const questionId = req.params.questionId;
        console.log('api hit', questionId)

        console.log(req.body.options);
        const options = req.body.options.map(option => ({
           
            text: option.text,
            isCorrect: option.isCorrect === 'on' 
        }));

        const correctOptions = options
    .filter(option => option.isCorrect)
    .map(option => option.text);
        
        const updatedQuestion = await Question.findByIdAndUpdate(questionId, {
            questionTitle: req.body.questionTitle,
            questionDescription: req.body.questionDescription,
            image: req.body.image,
            correctOptions: correctOptions,
            questionType: req.body.questionType,
            questionTags: req.body.questionTags,
            options: options,
        }, { new: true }); 
        
        if (!updatedQuestion) {
            return res.status(404).json({ success: false, message: 'Question not found' });
        }

        
        res.status(200).json({ success: true, message: 'Question updated successfully', updatedQuestion });
    } catch (error) {
        console.error('Error updating question:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});


// app.put("/testmaster/api/questions/:questionId", async (req, res) => {
//     try {
//         const questionId = req.params.questionId;
//         const updateData = req.body;


//         const updatedQuestion = await Question.findOneAndUpdate(
//             { questionId },
//             updateData,
//             { new: true }
//         );

//         if (!updatedQuestion) {
//             return res.status(404).json({ message: "Question not found" });
//         }

//         return res.json(updatedQuestion);
//     } catch (error) {
//         console.error("Error updating question:", error);
//         return res.status(500).json({ message: "Internal Server Error" });
//     }
// });


app.get("/questions-list", async (req, res) => {
    try {
        const questions = await Question.find();
        res.render("questions", { questions });
    } catch (error) {
        console.error("Error fetching questions:", error);
        res
            .status(500)
            .json({ success: false, message: "Error fetching questions" });
    }
});

app.get("/questions", async (req, res) => {
    try {
        const questions = await Question.find();

        res.status(200).json({ success: true, questions: questions });
    } catch (error) {
        console.error("Error fetching questions:", error);
        res
            .status(500)
            .json({ success: false, message: "Error fetching questions" });
    }
});

app.post('/testmaster/api/questionpapers', async (req, res) => {
    try {
        const { questionPaperTitle, description, minimumNumberForPassing } = req.body;


        const newQuestionPaper = new QuestionPaper({
            questionPaperTitle,
            description,
            minimumNumberForPassing,
           
        });


        const savedQuestionPaper = await newQuestionPaper.save();

        res.status(201).json(savedQuestionPaper._id);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/testmaster/api/questionpapers', async (req, res) => {
    try {
        const questionPapers = await QuestionPaper.find();

        res.render('questionpapers', { questionPapers });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/testmaster/api/questionpapers/:questionPaperId', async (req, res) => {
    try {
        const questionPaperId = req.params.questionPaperId;

        // Fetch the question paper data based on questionPaperId (you can replace this with your database query)
        const questionPaper = await QuestionPaper.findById(questionPaperId).exec();

        if (!questionPaper) {
            // Handle the case where the question paper is not found
            return res.status(404).json({ error: 'Question Paper not found' });
        }
        const questions = await Question.find({ questionId: { $in: questionPaper.questionIds } }).exec();
        // Return the question paper data as JSON
        // res.json(questionPaper);
        res.render('questionpaperdetails', { questionPaper, questions });


    } catch (error) {
        console.error('Error fetching question paper data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/testmaster/api/questionpapersdetails/:questionPaperId', async (req, res) => {
    try {
        const questionPaperId = req.params.questionPaperId;

        // Fetch the question paper data based on questionPaperId (you can replace this with your database query)
        const questionPaper = await QuestionPaper.findById(questionPaperId).exec();

        if (!questionPaper) {
            // Handle the case where the question paper is not found
            return res.status(404).json({ error: 'Question Paper not found' });
        }
        const questions = await Question.find({ questionId: { $in: questionPaper.questionIds } }).exec();
        // Return the question paper data as JSON
        // res.json(questionPaper);
        res.render('questionpaperdetails.ejs', { questionPaper, questions });

    } catch (error) {
        console.error('Error fetching question paper data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



app.delete("/testmaster/api/questions/:id", async (req, res) => {
    try {
        const questionId = req.params.id;

        const question = await Question.findById(questionId);

        if (!question) {
            return res
                .status(404)
                .json({ success: false, message: "Question not found" });
        }

        const imageFileName = question.image;
        const imagePath = path.join(__dirname, "public", "uploads", imageFileName);

        fs.unlinkSync(imagePath);

        await Question.findByIdAndDelete(questionId);
        res.status(204).send();
    } catch (error) {
        console.error("Error deleting question:", error);
        res
            .status(500)
            .json({ success: false, message: "Error deleting question" });
    }
});

app.get("/testmaster/api/exampaper", (req, res) => {
    const imageFiles = fs.readdirSync("./public/uploads/");
    let currentIndex = req.session.currentIndex || 0;

    currentIndex = (currentIndex + imageFiles.length) % imageFiles.length;

    req.session.currentIndex = currentIndex;

    res.render("exampaper", { images: imageFiles, currentIndex });
});

app.post("/next", (req, res) => {
    const imageFiles = fs.readdirSync("./public/uploads/");
    let currentIndex = req.session.currentIndex || 0;

    currentIndex = (currentIndex + 1) % imageFiles.length;

    req.session.currentIndex = currentIndex;

    console.log("currentIndex:", currentIndex);
    res.json("/images");
});

router.get('/questions-by-ids', async (req, res) => {
    try {
        // Get the array of questionIds from the request query
        const { questionIds } = req.query;
        console.log(questionIds)

        if (!questionIds) {
            return res.status(400).json({ error: 'Missing questionIds parameter' });
        }

        const ids = questionIds.split(',').map((id) => parseInt(id, 10));

        const questions = await Question.find({ questionId: { $in: ids } });

        const result = questions.map((question) => ({
            questionId: question.questionId,
            questionTitle: question.questionTitle,
            questionDescription: question.questionDescription,
        }));

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/editquestionspapers/:questionPaperId', async (req, res) => {
    try {
        const questionPaperId = req.params.questionPaperId;
        const questionPaper = await QuestionPaper.findById(questionPaperId).exec();

        if (!questionPaper) {
            // Handle the case where the question paper is not found
            return res.status(404).send('Question Paper not found');
        }

        // Fetch questions based on questionIds
        const questions = await Question.find({ questionId: { $in: questionPaper.questionIds } }).exec();

        res.render('editquestionspapers.ejs', { questionPaper, questions });
    } catch (error) {
        console.error('Error rendering edit question paper page:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.put('/testmaster/api/questionpapers/:questionPaperId', async (req, res) => {
    try {
        const questionPaperId = req.params.questionPaperId;
        const updatedData = req.body;

        const updatedQuestionPaper = await QuestionPaper.findByIdAndUpdate(questionPaperId, updatedData, { new: true });

        if (!updatedQuestionPaper) {
            // Handle the case where the question paper is not found
            return res.status(404).send('Question Paper not found');
        }

        res.json(updatedQuestionPaper);
    } catch (error) {
        console.error('Error updating question paper:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.delete('/testmaster/api/questionpapers/:questionPaperId',async (req, res) => {
    try{
        const questionPaperId = req.params.questionPaperId;

        const deletedQuestionPaper = await QuestionPaper.findByIdAndDelete(questionPaperId);

        if(!deletedQuestionPaper){
            return res.status(404).send('Question Paper not found');
        }
        res.status(204).send();
    }catch (error) {
        console.error('Error deleting question paper:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
