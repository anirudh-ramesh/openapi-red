# kdbx-red

This node let you get and manage OpenAPI 3 (Swagger) parameters and trigger them in your flow.
Based on [swagger-js](https://github.com/swagger-api/swagger-js)

## Get the API-operations list
Enter the path to your OpenAPI configuration (json or yaml file) and get a list of all stated operations.
![Operations](https://gitlab.com/2WeltenChris/openapi-red/raw/master/examples/operations.png?raw=true "Operations")

## Find all neccessary information
If stated you will find the neccessary information by mouse over the title or the key.
![operation description](https://gitlab.com/2WeltenChris/openapi-red/raw/master/examples/operation_description.png?raw=true "Operation description")
![parameter description](https://gitlab.com/2WeltenChris/openapi-red/raw/master/examples/parameter_description.png?raw=true "Parameter description")
![json description](https://gitlab.com/2WeltenChris/openapi-red/raw/master/examples/json_description.png?raw=true "Json description")

## Parameter configuration
Usually the parameter defines the type. You can use the standard type or set a message object or define a jsonata object.
If the parameter awaits a json object and the parameter has keys predefined you can set a sample json-object with the required keys or with all keys.

## Authentification token
If you need an authentification token you can log in by the node red standard 'http request' node. 
The jwt token you get there must be put into msg.openApiToken and will be placed in the header as bearer authentification.


## Sample flow
There is a sample flow where you can see how to configurate the node.
![Example](https://gitlab.com/2WeltenChris/openapi-red/raw/master/examples/examples.png?raw=true "Example Node")
