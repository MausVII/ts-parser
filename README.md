# ts-parser
## Description
This program written in TypeScript and turns a strings resembling Python/JavaScript code into an abstract syntax tree describing its composition.

## Features
Given known inputs, its output is deterministic and always foreseeable, therefore it was a great opportunity to give TDD a go. Every increment and feature added to the code had a few tests written before hand.   
Composed of a tokenizer which groups units together: var_one -> variable name, var_one + var_two -> three different entities, "var_one + var_two" -> a string. And the parser which describe units and their composition: class is made up of functions and variables, functions are made up of functions, variables, statements, statements are made of expressions, and so on.  
Output is an abstract syntax tree; trees work extremely well with recursion. Ergo, the program was designed in a recursive fashion.    

## To-Do
GUI
