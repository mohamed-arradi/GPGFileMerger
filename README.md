
[![MIT License][license-shield]][license-url]

<!-- PROJECT LOGO -->
<br />
<p align="center">
  <a href="#">
    <img src="icon.png" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">Universal GPG File Merger</h3>

  <p align="center">
    Universal Desktop Software that merge all your GPG Files in one ! 
<p align="center">Compatible Windows* / Linux / Mac OS</p>
<p>*<i>currently in dev</i></p>
    <br />
  </p>
</p>

<!-- TABLE OF CONTENTS -->
<details open="open">
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>


<!-- ABOUT THE PROJECT -->
## About The Project

This project started by a family member requirements for its personal use only... at the beginning it was a simple but rather long bash script :). The aim is to merge multiple .gpg files in one sigular gpg file with proper spacing and indentation.

I decided to create a small GUI to avoid any annoying scripting tasks. 

Basically you can add gpg files as much as you want, either by Dragging & Dropping or by simply adding them via the dialog box offered. 

Once this is done, you simply click on the merge button. 

Depending the OS you are on, if you are on Mac OS or Linux the experience will vary a little, but it basically decrypt the content of all files and them merge them into one. Once this step is done, it encrypt the merged file and display it to you.

Beware that you need to have GPG installed in your computer and with valid GPG keys inside your GPG Key manager for this software to work.


<!-- GETTING STARTED -->
## Getting Started

### Prerequisites

I repeat again here, but make sure GPG is installed on your system and that you have valid keys or create ones.

* npm
  ```sh
  npm install npm@latest -g
  npm start
  ```
The App should launch as per below (with a files list empty of course :)).

##### Mac OS Screen
![Mac OS Version](/screenshots/macos-screenshot.png)

#### Linux Screen
![Linux Version](/screenshots/linux-screenshot.png)

#### Windows Screen
 Work in Progress

### Built With

* [ElectronJS](https://www.electronjs.org/)

### Installation

As of now you need to have the source code in order to build. However I created a snap version in order to install it locally on your linux desktop. 

The nature of this software, require to not be sandboxed on Linux and the same applies for Mac OS. 

Here is the process to create the generated snap binary in order to install it on your system permanenty

  ```sh
  npm run dist
  ``` 
<!-- ROADMAP -->
## Roadmap

See the [open issues](https://github.com/mohamed-arradi/GPGFileMerger/issues) for a list of proposed features (and known issues).

<!-- CONTRIBUTING -->
## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE` for more information.


<!-- CONTACT -->
## Contact

Mohamed Arradi Alaoui - [@arradimohamed](https://twitter.com/arradimohamed) - hello@arradimohamed.fr


<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[license-shield]: https://img.shields.io/github/license/othneildrew/Best-README-Template.svg?style=for-the-badge
[license-url]: https://github.com/mohamed-arradi/GPGFileMerger/blob/main/LICENSE
