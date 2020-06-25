# mozaika

## overview
a little tool that i made to help quickly test different optimizations for [bitsy 3d](https://github.com/aloelazoe/bitsy-3d)

this is a node.js program, a local server that scans your project folder and responds with customizable variations of index.html page

## instructions
* you need to have node.js installed
* install mozaika: use `git clone https://github.com/aloelazoe/mozaika.git` or download it as an archive and unpack
* go to folder where you installed mozaika in your terminal
* run `npm i` to install mozaika's dependencies
* configure a folder structure of your project with different versions of resource files
* rename your main html file into index.html if you don't have one already
* use a simple templating syntax in index.html file to point to these folders and specify how they should be used (see below)
* go to your project folder in terminal and run 'mozaika.js' e.g.:
  * `cd my-project`
  * `/absolute/path/to/mozaika/mozaika.js`
* the browser will open and you will be presented with a simple gui that lets you arrange different versions of resource files in various combinations and run the resulting page

## templating rules
* `{@folder-name@}`: insert the path of the chosen file from this folder
* `{#folder-name#}`: insert the contents of the chosen file from this folder

## examples
you have a bitsy game in html file that you renamed into `index.html`. then you made a `data` folder beside your `index.html` file and put a number of bitsy game data files in there. then you replaced bitsy data inside your `index.html` with 'insert contents' token, like this:
```html
<script type="text/bitsyGameData" id="exportedGameData">
{#data#}
</script>
```
when you run mozaika, you will be presented with a menu where you could select what game data you want to use and run the game with that data

now this was very simple: you could have just had a bunch of html files with different game data. but it becomes really useful when you need to customize a number of different things, like if in addition to choosing what game data you want to use, you would also like to select from a number of different versions of bitsy hack or a library

for example this would allow you to load different versions of a hack that you put in a `hack` folder beside your `index.html`:
```html
<script src="{@hack@}"></script>
```
now you could test different sets of game data with different versions of your hack very quickly, instead of having a lot of duplicate files with different combinations of both and editing all of them by hand when you want to adjust something

