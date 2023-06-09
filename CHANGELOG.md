> **Attention:** ⚠️ means that a change breaks things. Manual adjustments will be necessary. So be careful before updating. Even data loss might occur.

## Version 1.1.3 (11th of January 2023)
- Bugfix for Safari with new SIR version

## Version 1.1.2 (09th of January 2023)
- Experimental: Bugfix for Safari

## Version 1.1.1 (18th of October 2022)
- Bugfix Parameters with special characters

**Version 1.1.0**
- Experimental: added dev mode (ignore old/self signed certificate)
- code refactoring
- Bugfix init content request/response type
- UI Changes
- Node-Red theme compatible

**Version 1.0.9**
- updated package.json no change in code

**Version 1.0.8**
- Url Regex check removed, but url will be error if not read successfully
- Updated swagger client and SIR 
- added required version Node-RED and node.js 

**Version 1.0.7**
- Code refactoring
- UI Tweaks
- Added 'Keep authentification'
- Keep description closed 

**Version 1.0.6**
- UI Fixes
- Select from Array Bugfix
- Return correct error

**Version 1.0.5**

- removed optional chaining on server side as Node-RED still supports node.js v.12

**Version 1.0.4**

- Fixing parameters css styling

**Version 1.0.3**

- Bugfix: show request body if available, even if there are additional parameters

**Version 1.0.2**

- Added response content type as selection
- Experimental feature added: Changing server
- Updated to latest SIR version
- Grouped general and api options UI (-> can be hidden now)

**Version 1.0.1**

- Fixed #3: URL properties were interpreted as operations

**Version 1.0.0**

- UI is now based on [SIR](https://gitlab.com/2WeltenChris/svelte-integration-red)
- Bugfix: Body can now be used again with OpenAPI 3

**Version 0.1.11**

- Merged authentification and proxy request by Tristan Bastian
- added gitpod files

**Version 0.1.10**

- Content type for body is now mandatory (updated swagger-js)

**Version 0.1.9**

- Minor changes on error handling
- Code changed to StandardJs code standard

**Version 0.1.8**

- Selectable error handling

**Version 0.1.7**

- Hide value input for parameter if not active
- Minor code changes

**Version 0.1.6**

- Bugfix input default values for objects. 
- Select input for OpenAPI 3 Request Body Object. (!Experimental and will always create a json object for now!)

**Version 0.1.5**

- Error notification and stop flow if required input is missing

**Version 0.1.4**

- Bugfix: Identification of parameter type and source

**Version 0.1.3**

- Operations without a tag will be placed in default

**Version 0.1.2**

- Added git repository tag