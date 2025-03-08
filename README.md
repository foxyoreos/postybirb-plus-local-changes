# PostyBirb+

**My local build of [Postybirb+](https://github.com/mvdicarlo/postybirb-plus), with a number of changes that I use to make it easier to manage my own workflow**

**THIS REPOSITORY IS MOSTLY FILLED WITH HACKS**

I work on this branch in my free time, and I pretty much only am trying to solve my own problems. Expect bugs if you use this. Expect things to be unpolished. BACK UP YOUR LOCAL SUBMISSIONS.

**THIS REPOSITORY CHANGES PARTS OF POSTYBIRB'S DATA SCHEMA IN WAYS THAT ARE INCOMPATIBLE WITH THE REAL VERSION**

If you use this program, you will not be able to migrate from it back to the real Postybirb release unless your data is backed up. Because of that, this repository uses a separate data directory from the real Postybirb and so your existing submissions will not migrate.

**WINDOWS BUILDS ARE UNTESTED**

I don't own a Windows computer, and while I've generated a Windows release, I have not tested it to see if it works. EVERYTHING here is at your own risk.

## Changes and Improvements

My branch of Postybirb+ is focused on fixing anything in Postybirb+ that makes it harder for me to manage multiple accounts and to post my own artwork. The majority of this work has gone into tag group improvements, but there are other areas that I've touched as well.

### Tag Groups and Tagging
- Tag search for Aryion, Itaku, and Inkbunny search the actual websites instead of e621 (no more needing to guess what tags exist on those sites).
- Tag groups are now set per-site. This means that you can have a tag group with different tags per-website. This is the largest change that I've made.
- Tag groups can have parent groups. Parent groups will be automatically applied when using the "Apply Groups" button.
- Adds a separate modal for applying groups that will apply them to every website you have selected in one step. This speeds up tagging across multiple sites dramatically.
- Tag groups can be placed in categories and searched.
- I pretty much only use groups for tagging now.

### Bluesky/Mastodon
- Bluesky and Mastodon file uploads can be split across multiple posts. Use a horizontal rule to split posts. There's some error handling here, but it might be buggy, I'm not sure. I haven't implemented this for notification submissions yet.
- Mastodon includes content warnings when calculating post length.
- Mastodon and Bluesky no longer warn you if you're missing tags (don't use tags, just put hashtags into your post directly).
- Mastodon has slightly better handling of file upload posts that are split between different posts (ie, if you upload 5 images but your server only allows 4 per-post).
- Bluesky allows you to add graphic content warnings. I'll be improving this in the future and submitting an actual pull request for it.

### Misc
- Aryion can accept PDFs.
- Merged https://github.com/mvdicarlo/postybirb-plus/pull/386 - I will likely add some improvements and changes to this in the future, I'm working on allowing arbitrary references to previous uploads.
- You can add an image preview by clicking "reuse" in the preview window. This saves you from having to navigate to the image twice.
- Adds a {not} shortcut that acts like the opposite of {only} (very useful for having default or backup links inside of shortcuts).
- Website sections are collapsible. This actually causes a minor performance benefit when filling out website data.
- There's a little tiny image in the right hand corner that you can mouse over to get a big view of your pic during file submissions, in case you've forgotten what it looks like.

### Known Bugs
- A whole lot of styling issues.
- There are probably issues with thread-splitting for Bluesky and Mastodon that I haven't found yet.
- If you delete a parent group, I'm not 100% certain that the child groups won't break, I haven't added actual cleanup for them yet.
- Data migration doesn't move the urls of images yet.
- Probably other things.

## How to deploy:
- You can build from source if you'd like, or you can use one of the releases. The real Postybirb uses ``/Documents/Postybirb`` as its data folder. My build uses ``Documents/Postybirb-foxyoreos``. This is to make sure that you have to back things up. Back up your ``Documents/Postybirb`` folder to a separate location (``Postybirb-bak`` or something similar) and then **copy and paste** (do not cut) your ``Postybirb`` folder to ``Postybirb-foxyoreos``.
- Alternatively, if you don't have a lot of submissions or are just playing around, just launch it and you'll be able to start from scratch :3

## Have you noticed bugs?

Tell me! But don't assume I'll have time to fix them quickly. Again, I maintain this build to help support my artwork, and I have precious little time to program. Most changes here were built quickly to solve very specific problems. But it is still good for me to know about bugs!

If you want to pay me to work on something, you can sign up for my programming tier at [https://subscribestar.adult/foxyoreos](https://subscribestar.adult/foxyoreos) or commission me at [https://ko-fi.com/foxyoreos](https://ko-fi.com/foxyoreos). If you're going to throw money at me though, first consider supporting the actual Postybirb project at [https://www.postybirb.com/donate.html](https://www.postybirb.com/donate.html). Lemonynade has put a ton of work into the application, and without it, I wouldn't be able to do any of what I do as an artist <3

# Original Docs

**A rewrite of the desktop application [PostyBirb](https://github.com/mvdicarlo/postybirb) using TypeScript, NestJS, React, and Electron.**

## [Commons](/commons)
Shared interfaces, models, etc. between the UI and Backend.

## [Electron-App](/electron-app) (backend)
ElectronJS + NestJs that handles running the local server and the desktop application itself.
This is where all posting magic happens.

## [UI](/ui)
React code that handles UI of the application displayed in the desktop application.

## Configuring for local development

To set up a local copy of PostyBirb for development:

1. clone this repository and `cd` into it.
2. `npm run contribute` to install dependencies in every folder.

Please note that if you have node version 16 and above (you can check that by running `node -v`), you should use  `NODE_OPTIONS=--openssl-legacy-provider npm run contribute` 
instead.

<details>
  <summary>INSTALL TROUBLESHOOTING</summary>

  ### Common
  If something does not work and you can't determine where error happened (since there is 3 parallel scripts) run `npm run contribute:debug`

  ### ERR_OSSL_EVP_UNSUPPORTED
  <details>
    <summary>Error</summary>

```
Error: error:0308010C:digital envelope routines::unsupported
  at new Hash (node:internal/crypto/hash:71:19)
  at Object.createHash (node:crypto:133:10)
  at module.exports (ui\node_modules\webpack\lib\util\createHash.js:135:53)
  at NormalModule._initBuildHash (ui\node_modules\webpack\lib\NormalModule.js:417:16)
  at ui\node_modules\webpack\lib\NormalModule.js:452:10
  at ui\node_modules\webpack\lib\NormalModule.js:323:13
  at ui\node_modules\loader-runner\lib\LoaderRunner.js:367:11
  at ui\node_modules\loader-runner\lib\LoaderRunner.js:233:18
  at context.callback (ui\node_modules\loader-runner\lib\LoaderRunner.js:111:13)
  at ui\node_modules\babel-loader\lib\index.js:55:103
  at process.processTicksAndRejections (node:internal/process/task_queues:95:5) {    
  opensslErrorStack: [ 'error:03000086:digital envelope routines::initialization error' ],
  library: 'digital envelope routines',
  reason: 'unsupported',
  code: 'ERR_OSSL_EVP_UNSUPPORTED'
}
```
    
  </details>

To fix this error, use `NODE_OPTIONS=--openssl-legacy-provider` before any npm command.
 
</details>

### Start

```
npm run start
```

## Building

To build production vesrion of the PostyBirb, use the following:
```
npm run build
```

Please not that if you have node version 16 and above (you can check that by running `node -v`), you should use  `NODE_OPTIONS=--openssl-legacy-provider npm run build` 
instead.

And then, depending on your build target, use this command:
```
cd electron-app && yarn run release:windows
cd electron-app && yarn run release:linux
cd electron-app && yarn run release:osx
```

## Contribution Guide
_Pending_

If you are interested in adding features or websites to the application, please let me know.

PR branch is develop.

Dont forget to `npm run test --prefix electron-app` before pull 

Also run `npm run codestyle` if you haven't installed eslint and prettier extensions!
