# e-commerce
POST --> to signup new user --> http://localhost:4000/user/signup
         {
	"name":"boss",
	"email":"boss@gmail.com",
	"password":"1234",
	"role":"admin"
}

POST --> for login and get JWT --> http://localhost:4000/user/login
        {
  "email":"boss@gmail.com",
	"password":"1234"
}

POST --> to add new product require admin JWT token http://localhost:4000/product/
{
"title":"macbookpro",
	"description":"laptop",
	"price": "150000",
	"stock" : 10
	
}


GET --> to get the list of products http://localhost:4000/product/

POST --> to generate perchase token - which requires the JWT of user (only used once )--> http://localhost:4000/order/token/:productID

POST --> to order product need JWT of user--> http://localhost:4000/order/
{
  "token": "perchase token",
  "quantity": 5
}

GET --> to get the all orders --> http://localhost:4000/order/all

