//notes on running
//to run script in package.json you will just need to say npm run (key name) so ex) npm run test
 ex.. npm run dev => runs dev script string in package.json

 NODEMON:
 we use nodemon to capture changes in the typescript files and pushes updates to server. which is super nice. 
 enables us to update the typescript and see changes..
 nodemom needs to be installed with npm. 
 nodemon is written in our script text for the dev env in the package.json file

// stops nodemon 
//Ctrl + C stops the server

//tsconfig-paths module needed to ensure absolute paths or paths changes wont negatively affect execution..
had to install via npm then add it to the script string for the dev env.. more will be explained later in the tutorial on this. 

MONGODB 
// start mongodb: brew services start mongodb-community@6.0
// stop mongodb: brew services stop mongodb-community@6.0
// site reference: https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-os-x/

needs to be started before the application starts. 

//to start redis server
command prompt
redis-server

//to stop server
redis-cli shutdown


