# Math-Gacha

*An app for people who are bored with the usual way of studying and want to try something different. Turn your LaTeX file into JSON, feed it into a gacha machine, and let it pick your next problem for you. Also works great for challenging a friend.*

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://alzimna.github.io/Math-Gacha/)

## Overview

Normally, we keep competition problems in a LaTeX file and work through them in order, year by year, problem by problem, following whatever sequence the contest itself used. Some contests sort their problems by difficulty, so the ones that appear later tend to be harder than the first. This project offers a different approach: it randomizes your problem database instead.

The project has two phases. First, `tex_to_csv.py` turns your LaTeX files into a CSV or JSON. Then, using that JSON, the web app turns your problem database into a spinning gacha machine.

This isn't just for solo use, either. Me and my "friend" used to battle over contest problems, whoever solved it first won. So you can use this to study on your own, or turn it into a head-to-head challenge with a friend.

## Project Structure

```
Math-Gacha
│   .gitignore
│   LICENSE
│   README.md
│
├───.github
│   └───workflows
│           main.yml
│
├───app
│   │   index.html
│   │   practice.html
│   ├───css
│   ├───Figure
│   ├───js
│   └───output
│
├───notebooks
│       tex_parser.ipynb
│
├───parser
│   │   tex_to_csv.py
│   │   __init__.py
│
└───Tex
        answer.tex
        problem.tex
```

## Getting Started

Try the [live version](https://alzimna.github.io/Math-Gacha/), or pull this repository to run it locally. To run the web app on your own machine, you'll need something that can serve local files, e.g. the Live Server extension in VS Code. You can also swap in your own contest problem collection by placing your files in the `Tex` folder.

| File | Extension | Note |
| :--- | :---: | ---: |
| problem | `.tex` | Container for your problems. To use `tex_to_csv.py` directly, follow the format used in `/Tex/problem.tex`. |
| answer | `.tex` | Container for the answer key. To use `tex_to_csv.py` directly, follow the format used in `/Tex/answer.tex`. |

## Main Components

**1. LaTeX parser**. In the `parser` folder you'll find `tex_to_csv.py`, a Python program that parses LaTeX files into a database format such as CSV or JSON. `notebooks/tex_parser.ipynb` walks through an example using `problem.tex` and `answer.tex` from the `Tex` folder.

**2. Math-Gacha app**. In the `app` folder you'll find the web components, HTML, CSS, and JS, that build the [live version](https://alzimna.github.io/Math-Gacha/). Inspired by [Off The Cuff](https://www.offthecuffspeech.com/), which I came across while prepping for my IELTS exam, I built the gacha machine to have fun with my contest problem collection, either solo or with a friend. The visual template drew inspiration from [Asadi Ahmad's Personal Website](https://github.com/AsadiAhmad/Personal-Website), and was built together with my team (namely, Claude and ChatGPT).

## LaTeX Parser Workflow

To parse your own LaTeX file:

1. Clone this repository with Git Bash, or download it as a ZIP, see [this guide](https://dev.to/coreystevens/how-to-clone-a-github-repository-1f1) if you're not sure how.

2. Open a Jupyter notebook and import `Problem_to_CSV` and `Answer_to_CSV` from the `parser` folder.

3. Make sure your LaTeX files follow the template used by `problem.tex` and `answer.tex` in the `Tex` folder. The requirements for `problem.tex` are:
   - Each contest should be placed in its own section.
   - Each problem within a contest should begin with an italic keyword, e.g. _(contestyear)_.
   - Use inline math mode for `\dots` patterns.
   - Wrap any figure in at least a bare
     ```
     \begin{figure}

     \end{figure}
     ```
     block.

4. Pass your LaTeX file path as the input to `Problem_to_CSV` and `Answer_to_CSV`.

5. Access the resulting DataFrame from the class instance, you can export it to CSV or JSON with `pandas`.

## How to Use the Web App

1. Filter your problems by competition, stage, or year. By default, every problem in the JSON file is included.
2. Use **Clear Filters** to reset, the problem count returns to the full set.
3. Click **Proceed** to open the gacha page. Your filtered problems will be shown in a column.
4. Click **Gacha!** to start the spin. Once it stops, your problem is revealed.
5. Not feeling it? Click **Spin Again** to draw a different one.
6. Once you've settled on a problem, set your timer, in `mm:ss` format, where `mm` is minutes (0-59) and `ss` is seconds (0-59).
7. Click **Proceed** to move to the problem screen. Stop the timer early with the **Stop Timer** button, or let it run out on its own.
8. From there, jump straight into another problem with **Spin Again**, or head back to the filter screen via the **Practice** link in the navigation bar.

## Future Development

This is still very much a toddler project, but a few ideas have crossed my mind to keep it growing:

- Support for another language option.
- Adding problem topic as a filter category.
- A trivia section surfacing fun facts about the contest problems (most frequent topics, how topic frequency shifts across problem numbers, etc.).
- A "similar problems" section, showing related problems from across the database for whatever you're currently viewing, the way e-commerce sites suggest similar products.
- Separately, I'm planning a "problem wrapper" tool that exports a filtered subset of problems back into a LaTeX file, so you can build your own custom problem sets.