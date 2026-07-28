from pathlib import Path
import re

import pandas as pd

SECTION_PATTERN = r'(\\section\*?\{.*?\})'
ITEM_PATTERN = r'\\item\s?\\textit\{.*?\}'
ITEMANS_PATTERN = r'\\item'
FIGURE_PATTERN = r'\\includegraphics\[.*?\]\{Figure\/(.*?)\}'
DOTS_PATTERN = r"(\\[a-z]*dots?)([.,;:!?]?)\s*$"
ENVS = ["dot", "ldot", "cdot"]
TEXT_DICT = {
        "textit": "em",
        "textbf": "strong",
    }

FIGURE_PATH = "Figure/"


def tex_to_parts(data: str) -> list[str]:
    return re.split(SECTION_PATTERN, data)


def tex_to_dict(section_parts: list[str]) -> dict[str, str]:
    problems_dict: dict[str, str] = {}
    for i, part in enumerate(section_parts):
        header_match = re.search(SECTION_PATTERN, part)

        body = section_parts[min(i + 1, len(section_parts) - 1)]
        has_items = re.search(ITEMANS_PATTERN, body)

        if header_match and has_items:
            key = re.search(r'\{(.*?)\}', part).group(1)
            problems_dict[key] = section_parts[i + 1]
    return problems_dict


def _section_to_item_parts(pattern: str, section_part: str) -> list[str]:
    return re.split(pattern, section_part)[1:]


def _section_to_item_dict(item_parts: list[str]) -> list[str]:
    problems: list[str] = []
    for part in item_parts:
        end_match = re.search(r'\\end\{enumerate\}', part)
        if end_match:
            part = part[:end_match.start()]
        problems.append(part)
    return problems


def _clean_whitespace(text: str) -> str:
    lines = [line.strip(' \t') for line in text.split('\n')]
    cek = '\n'.join(lines).strip()
    cek = re.sub(DOTS_PATTERN, r"$\1$", cek)
    return cek


def _parse_competition_stage_year(key: str) -> tuple[str, str, str]:
    if re.search(r'^OS', key):
        competition_name = "OSN"
    else:
        competition_name = re.findall(r'(.*?)\s\d', key)[0]

    if re.search(r'^OSK', key):
        stage_name = "Regional"
    elif re.search(r'^OSP', key):
        stage_name = "Provincial"
    elif re.search(r'^OSN', key):
        stage_name = "National"
    else:
        stage_name = "International"

    year = re.findall(r'\s(\d{4})', key)[0]

    return competition_name, stage_name, year

ITEMIZE_REPL= [(r'\\begin\{itemize\}', r'<ul>'),
        (r'\\end\{itemize\}', r'</ul>')]

def _itemize_to_html(cek) -> str:
    if re.search(ITEMIZE_REPL[0][0],cek) :
        for pat,repl in ITEMIZE_REPL:
                cek = re.sub(pat, repl,cek)
        a = re.search(r'<ul>\n?',cek).end()
        b = re.search(r'</ul>\n?',cek).start()
        temp = re.split(r'\\item\s?',cek[a:b])[1:]
        temp = f"<li>{"</li><li>".join(temp)}</li>"
        res = f"{cek[:a]}{temp}{cek[b:]}"
        return res
    return cek

def _replace_cmd(cek) -> str:
    result = cek
    for cmd, tag in TEXT_DICT.items():
        result = re.sub(
            rf'\\{cmd}\{{(.*?)\}}',
            lambda m: f'<{tag}>{" ".join(m.group(1).split())}</{tag}>',
            result,
            flags=re.DOTALL,
        )
    return result


class Problem_to_CSV:
    def __init__(self, tex_file: str | Path) -> None:
        self.filename = Path(tex_file) if isinstance(tex_file, str) else tex_file
        with open(self.filename, 'r', encoding='utf-8') as f:
            self.data = f.read()

        section_parts = tex_to_parts(self.data)
        self.problems_dict = tex_to_dict(section_parts)
        self.problems_parser()
        self.problems_metadata_retriever()
        self.clean_statements()
        self.figure_parser()

    def problems_parser(self) -> None:
        for key, section_text in self.problems_dict.items():
            item_parts = _section_to_item_parts(ITEM_PATTERN, section_text)
            self.problems_dict[key] = _section_to_item_dict(item_parts)
            print(f"Parsing {key} is succeeded")

    def problems_metadata_retriever(self) -> None:
        competition, stage, year, number, problem_statement,ids = [], [], [], [], [],[]

        commands = ["dots", "dot", "cdots", "ldots"]
        pattern = rf'\\(?:{"|".join(commands)})\s*$'
        for key, values in self.problems_dict.items():
            competition_name, stage_name, y = _parse_competition_stage_year(key)

            for num in range(1, len(values) + 1):
                competition.append(competition_name)
                stage.append(stage_name)
                year.append(y)
                number.append(num)
                problem_statement.append(re.sub(pattern, lambda m: f'${m.group(0).strip()}$', values[num - 1]))
                temp = f"{competition_name}_{stage_name}_{y}_{str(num)}"
                ids.append(temp)

        self.problems_df = pd.DataFrame({
            "Competition": competition,
            "Stage": stage,
            "Year": year,
            "Number": number,
            "Problem Statement": problem_statement,
            "ID": ids
        })

    def clean_statements(self) -> None:
        self.problems_df["Problem Statement"] = (
            self.problems_df["Problem Statement"].apply(_clean_whitespace)
                                                .apply(_itemize_to_html)
                                                .apply(_replace_cmd)
        )

    def figure_parser(self) -> None:
        df = self.problems_df
        figures = []

        for i in range(len(df)):
            statement = df.loc[i, "Problem Statement"]
            match = re.search(FIGURE_PATTERN, statement)
            if not match:
                figures.append("")
                continue

            fig_year = df.loc[i, "Year"]
            fig_competition = df.loc[i, "Competition"]
            fig_stage = df.loc[i, "Stage"]
            fig_num = df.loc[i, "Number"]
            fig_ext = Path(match.group(1)).suffix

            fig_name = "_".join([fig_year, fig_competition, fig_stage, str(fig_num)]) + fig_ext
            figures.append(fig_name)

            img_tag = f'<img src="{FIGURE_PATH}{fig_name}" style="display:block; width:400px; max-width:100%; height:auto; margin:20px auto 0;">'
            df.loc[i, "Problem Statement"] = re.sub(
                r'\\begin\{figure\}.*?\\end\{figure\}',
                img_tag,
                df.loc[i, "Problem Statement"],
                flags=re.DOTALL,
            )

        df["Figure"] = figures
        self.problems_df = df


class Answer_to_CSV:
    def __init__(self, tex_file: str | Path) -> None:
        self.filename = Path(tex_file) if isinstance(tex_file, str) else tex_file
        with open(self.filename, 'r', encoding='utf-8') as f:
            self.data = f.read()

        section_parts = tex_to_parts(self.data)
        self.answers_dict = tex_to_dict(section_parts)
        self.answers_parser()
        self.answers_metadata_retriever()

    def answers_parser(self) -> None:
        for key, section_text in self.answers_dict.items():
            item_parts = _section_to_item_parts(ITEMANS_PATTERN, section_text)
            self.answers_dict[key] = _section_to_item_dict(item_parts)
            print(f"Parsing Answers {key} is succeeded : {len(self.answers_dict[key])}")

    def answers_metadata_retriever(self) -> None:
        competition, stage, year, number, answers = [], [], [], [], []

        for key, values in self.answers_dict.items():
            competition_name, stage_name, y = _parse_competition_stage_year(key)

            for num in range(1, len(values) + 1):
                competition.append(competition_name)
                stage.append(stage_name)
                year.append(y)
                number.append(num)
                answer_text = self._extract_answer_text(values[num - 1], key, num)
                answers.append(answer_text)

        self.answers_df = pd.DataFrame({
            "Competition": competition,
            "Stage": stage,
            "Year": year,
            "Number": number,
            "Answer": answers
        })

    def _extract_answer_text(self, raw: str, key: str, num: int) -> str:
        match = re.search(r'^\s(.*?)\n\t?$', raw)
        if match:
            return _clean_whitespace(match.group(1))

        print(
            f"[warning] Answer regex did not match for {key!r} #{num} "
            f"in {self.filename} -- using stripped raw text instead. "
            f"Raw value: {raw!r}"
        )
        return raw.strip()