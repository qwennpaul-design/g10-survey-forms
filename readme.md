# G10 GNHS Universal Survey System

## Architecture

- Netlify = hosting
- Google Forms = iisang response receiver
- Google Sheets = response storage
- `style.css` = shared CSS
- `survey.js` = shared survey engine
- `surveyId0001.html`, `surveyId0002.html`, `surveyId0003.html` = independent survey configurations

Walang Netlify Functions, Netlify Database, o `/api/submit`.

## Universal Google Form

Ang Google Form ay generic receiver. Maaari itong magkaroon ng:

```text
Survey ID
Survey Title
Name
Section
Gender
Date
Contact
Question 1
Answer 1
...
Question 30
Answer 30
```

Ang `survey.js` ang naglalagay ng aktuwal na tanong at sagot sa mga slot na ito.

### Multiple choice

Kung ang choices ay:

```text
A. Sticky notes
B. Pagbabasa
C. Panonood
D. Flashcard
```

at pinili ang C, ang ipinapasa sa Google Form ay:

```text
Panonood
```

Hindi `C`.

### Checkboxes

Kung pinili ang:

```text
Pagbabasa
Panonood
Flashcard
```

ang ipinapasa ay:

```text
Pagbabasa, Panonood, Flashcard
```

Hindi ang mga titik.

## Google Form configuration

Sa bawat survey HTML, gamitin ang:

```js
googleFormActionUrl
googleFormEntries
```

Iisang `formResponse` URL ang gagamitin ng lahat ng survey.

Ang `entry.REPLACE_*` values ay placeholders lamang. Huwag mag-imbento ng tunay na IDs.

Ang universal form ay dapat may mappings para sa:
- Survey ID
- Survey Title
- Name
- Section
- Gender
- Date
- Contact
- Question 1 / Answer 1 hanggang Question 30 / Answer 30

## Pagdagdag ng Survey 4

Gumawa ng `surveyId0004.html` na may sariling `window.SURVEY_CONFIG`, tapos gamitin ang:

```html
<script src="survey.js" defer></script>
```

Hindi kailangan ng bagong JS.

## Maximum

Default: 30 question/answer pairs bawat submission. Baguhin sa `maxUniversalQuestions` kung kinakailangan.

## Netlify

Static deployment lang ang kailangan.


## Universal Google Form connection

The three survey pages are configured to submit to the same Google Form:
- Responder link: https://docs.google.com/forms/d/e/1FAIpQLSd1niUoNpxoaoypbrvQtdl3FR82GEgTPsdkmiBKtouCvKXqLg/viewform
- Submission endpoint: https://docs.google.com/forms/d/e/1FAIpQLSd1niUoNpxoaoypbrvQtdl3FR82GEgTPsdkmiBKtouCvKXqLg/formResponse

The universal receiver currently has 10 Question/Answer pairs. All three HTML pages use the same field mappings and shared `survey.js`.

Note: the form field IDs were extracted from the user-provided Google Forms pre-filled URL. The website configuration has been updated, but a live submission test still needs to be performed in the browser.
