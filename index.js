import { load } from 'cheerio';
import { EPub } from "@lesjoursfr/html-to-epub";
import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';

function getTodaysDate() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();

    return `${dd}/${mm}/${yyyy}`;
}

// It's just for prevent PM2 first run. Keep it commented to run locally.
// Uncomment it to run with PM2 in cluster mode.
// if (!process.env.exit_code) {
//     process.exit(0);
// }

const transporter = nodemailer.createTransport({
    service: 'gmail',
    secure: true,
    auth: {
        user: process.env.SENDER_EMAIL,
        pass: process.env.SENDER_PASSWORD,
    },
});

(async () => {
    const getRecentPost = async () => await fetch('https://thenewscc.beehiiv.com/?_data=routes%2Findex')
        .then(res => res.json())
        .then(data => data['paginatedPosts']['posts'][0])
        .catch(() => {
            console.log('Error fetching slug');
            return;
        });

    let recentPost = await getRecentPost();

    // Todays post is not available yet
    if (recentPost?.web_title !== getTodaysDate()) {
        let tries = 0;
        let gotTodaysPost = false;

        // The news is published monday to saturday at 6:06
        // cronjob starts 6:15, so we wait 15 minutes, maximum of 7 times
        while (!gotTodaysPost && tries < 8) {
            await new Promise(resolve => setTimeout(resolve, 900000));
            recentPost = await getRecentPost();
            gotTodaysPost = recentPost?.web_title === getTodaysDate();
            tries++;
            console.log(`Tentativa ${tries} de 7`);
        }

        if (!gotTodaysPost) {
            console.log('Não foi possível encontrar a notícia de hoje.');
            return;
        }
    }

    let todayPostSlug = recentPost.slug;

    const info = await fetch(`https://thenewscc.beehiiv.com/p/${todayPostSlug}?_data=routes%2Fp%2F%24slug`)
        .then(res => res.json())
        .then(data => data)
        .catch(() => {
            console.log('Error fetching page');
            return;
        });

    const page = info.post.html;

    const $ = load(page);

    const blackList = [
        'PATROCINADO',
        'GIVEAWAY',
        'RODAPÉ',
        'OPINIÃO DO LEITOR',
        'YELLOW QUIZ',
        'DICAS DO FINAL DE SEMANA',
    ];

    let posts = Array.from(
        new Set(
            $('#content-blocks div > div > h5')
                .map((_, h5) => $(h5).parent().parent().toString())
                .get()
        )
    ).map(html => $(html))
        .filter(post =>
            !post.attr('id') &&
            !blackList.some(blacklisted => post.text().includes(blacklisted))
        );

    if (posts.length < 2) {
        // By titles:
        // Array.from(document.querySelectorAll('#content-blocks [id] > h5 > span[style*="color:#FFCF00"], span[style*="color:rgb(255, 207, 0)"]')).map(a => a.parentElement.parentElement).filter(post => !blackList.some(blacklisted => post.innerText.includes(blacklisted)))
        const childDivSelector = 'div[style*="border-top: 1px solid #dcdcdc"]';
        const dividers = $('#content-blocks').find(childDivSelector).parent();
        posts = [];

        dividers.each((index, divider) => {
            if (index < dividers.length - 1) {
                let contentElements = $(divider).nextUntil(dividers.eq(index + 1));

                let $combinedContent = $('<div>').append(contentElements.clone());

                $combinedContent.find('img').remove();
                $combinedContent.find('button').remove();
                $combinedContent.find('style').remove();

                let concatenatedHTML = $combinedContent.html();

                if (concatenatedHTML) {
                    const hasH5 = /<h5\b[^>]*>(.*?)<\/h5>/i.test(concatenatedHTML);
                    const isYellow = /<span\b[^>]*style="[^"]*color:\s*(?:rgb\(\s*255,\s*207,\s*0\s*\)|#FFCF00)[^"]*"[^>]*>.*?<\/span>/i.test(concatenatedHTML);
                    if (!blackList.some(blacklisted => concatenatedHTML.includes(blacklisted)) && hasH5 && isYellow) {
                        let $post = $('<div>').html(concatenatedHTML);
                        posts.push($post);
                    }
                }
            }
        });
    }

    const contents = [];

    posts.forEach(post => {
        post.find('img').remove();
        post.find('button').remove();
        post.find('style').remove();
        const title = post.find('h5').eq(1).text();
        const content = post.html();

        title && contents.push({ title, data: content });
    });

    const options = {
        title: `The News ${info.post.web_title}`,
        author: 'Waffle',
        lang: 'br',
        content: contents,
        appendChapterTitles: false,
        tocTitle: 'Sumário',
        hideToC: true
        // cover: `${process.cwd()}/thumbnail.png`, // Cover image will appear in the first page of the epub, It's not working properly, so I'm not using it
    };

    const epub = new EPub(options, `${process.cwd()}/the-news-${todayPostSlug}.epub`);
    await epub.render();

    await transporter.sendMail({
        from: process.env.SENDER_EMAIL,
        to: process.env.KINDLE_EMAIL,
        subject: `The News for Kindle - ${info.post.web_title}`,
        text: `The News ${info.post.web_title}\n${contents.map(content => content.title).join('\n')}`,
        attachments: [{
            filename: `the-news-${todayPostSlug}.epub`,
            path: `${path.resolve('')}/the-news-${todayPostSlug}.epub`,
            contentType: 'application/epub+zip'
        }],
    }, async (error, info) => {
        if (error) {
            console.log('Erro ao enviar e-mail:', error);
        } else {
            console.log('E-mail enviado com sucesso:', info.response);
        }

        try {
            const files = fs.readdirSync(process.cwd());
            files.forEach(file => {
                if (file.endsWith('.epub')) {
                    fs.unlinkSync(path.join(process.cwd(), file));
                    console.log(`Arquivo ${file} excluído.`);
                }
            });
        } catch (err) {
            console.error('Erro ao ler ou excluir arquivos no diretório:', err);
        }
    });
})();
