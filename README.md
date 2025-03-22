## Enterprise Web Development module - Serverless REST Assignment.

__Name:__ Edwin Jose

__Demo:__ [Video Demo](https://youtu.be/LKnnv38DnUo)

### Overview  

This repository contains a CDK stack which can be exported to AWS Cloud. The CDK application supports authentication APIs, some of which are:

- Sign In
- Sign Up
- Verify Sign Up
- Sign Out

There are endpoints through which the users are able to add, update, get, and fetch the translated movie reviews available in the REST API of the stack.

### App API endpoints  

- *GET* /movie/reviews/{movieId} - Fetch all the reviews for the specified movie. It also accepts an optional query string that specifies a review ID or reviewer identity (email address), e.g.,?reviewId=1234 or?reviewerName=joe@gmail.com.  
- *POST* /movie/protected/reviews - Add a movie review. Only authenticated users can post a review.  
- *GET* /reviews/{reviewId}/{movieId}/translation - Requires an optional parameter "language" for translation. The language code must be provided as input.  
- *PUT* /movie/reviews/{movieId}/protected/reviews/{reviewId} - Update a review for a specific movie. Only authenticated users can update a review.  

### Features  

#### Translation persistence  


#### Custom L2 Construct

##### Constructs used and input properties  

*AppApi Input Props:*  

typescript
type AppApiProps = {
    userPoolId: string;
    userPoolClientId: string;
  };


*AppApi Public Properties:*  

typescript
export class AppApi extends Construct {
  constructor(scope: Construct, id: string, props: AppApiProps) {
    super(scope, id,);
}
};


*AuthApiInput Props:*  

typescript
type AuthApiProps = {
  userPoolId: string;
  userPoolClientId: string;
};  


typescript
export class AuthApi extends Construct {
  private auth: apig.IResource;
  private userPoolId: string;
  private userPoolClientId: string; 
};


#### Restricted Review Updates  

- Only current users have access to the *PUT* and *POST* REST APIs that are utilized for posting and modifying reviews.
- A *Authorization token* received during sign-up must be used in the API request header to perform these operations.