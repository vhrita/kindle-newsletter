import { load } from 'cheerio';
import { EPub } from "@lesjoursfr/html-to-epub";
import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';

function areDatesEqual(date1, date2) {
    const dateOnly1 = date1.toISOString().split('T')[0];
    const dateOnly2 = date2.toISOString().split('T')[0];
    return dateOnly1 === dateOnly2;
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    secure: true,
    auth: {
        user: process.env.SENDER_EMAIL,
        pass: process.env.SENDER_PASSWORD,
    },
});

(async () => {
    console.time('Script execution time');
    console.log('Iniciando script...');
    const getRecentPost = async () => await fetch('https://thenewscc.beehiiv.com/?_data=routes%2Findex')
        .then(res => res.json())
        .then(data => data['paginatedPosts']['posts'][0])
        .catch(() => {
            console.log('Error fetching slug');
            return;
        });

    let recentPost = await getRecentPost();

    // Todays post is not available yet
    if (!areDatesEqual(new Date(recentPost?.updated_at), new Date())) {
        console.log('A notícia de hoje ainda não foi publicada.');
        let tries = 0;
        let gotTodaysPost = false;

        // The news is published monday to saturday at 6:06
        // cronjob starts 6:15, so we wait 15 minutes, maximum of 7 times
        while (!gotTodaysPost && tries < 8) {
            await new Promise(resolve => setTimeout(resolve, 900000));
            recentPost = await getRecentPost();
            gotTodaysPost = areDatesEqual(new Date(recentPost?.updated_at), new Date());
            tries++;
            console.log(`Tentativa ${tries} de 7`);
        }

        if (!gotTodaysPost) {
            console.log('Não foi possível encontrar a notícia de hoje.');
            return;
        }
    }

    let todayPostSlug = recentPost.slug;
    console.log('Slug da notícia de hoje:', todayPostSlug);

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
        'PESQUISA DO',
        'QUEM SOMOS',
        'APRESENTADO POR',
        'PROGRAMA DE',
    ];

    console.log('Iniciando extração de conteúdo...');
    const contentBlocks = $('#content-blocks').children();
    const posts = [];

    let currentPost = null;
    contentBlocks.each((_, el) => {
        const $el = $(el);
        const isPostTitle = $el.find('h5 span[style*="color:#FFCF00"], h5 span[style*="color:rgb(255, 207, 0)"]').length > 0;

        if (isPostTitle) {
            const title = $el.text().trim().toUpperCase();
            const isBlacklisted = blackList.some(b => title.includes(b));
            if (currentPost) posts.push(currentPost); // Salva o post anterior, independente do próximo ser blacklisted
            currentPost = isBlacklisted ? null : $('<div>').append($el.clone());
        } else if (currentPost) {
            currentPost.append($el.clone());
        }
    });
    if (currentPost) posts.push(currentPost);

    const contents = [];
    posts.forEach(post => {
        post.find('button, style').remove();
        const title = post.find('h5').eq(1).text() || post.find('h5').eq(0).text();
        const content = post.html();

        const isBlacklisted = blackList.some(bl =>
            post.find('h5,h4').toArray().some(h => $(h).text().toUpperCase().includes(bl))
        );

        if (title && !isBlacklisted) {
            contents.push({ title, data: content });
        }
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

    console.log('Iniciando geração do arquivo epub...');
    const epub = new EPub(options, `${process.cwd()}/the-news-${info.post['web_title'].replaceAll('/', '-')}.epub`);
    await epub.render();

    console.log('Iniciando envio de e-mail...');
    await transporter.sendMail({
        from: process.env.SENDER_EMAIL,
        to: process.env.KINDLE_EMAIL,
        subject: `The News for Kindle - ${info.post.web_title}`,
        text: `The News ${info.post.web_title}\n${contents.map(content => content.title).join('\n')}`,
        attachments: [{
            filename: `the-news-${info.post['web_title'].replaceAll('/', '-')}.epub`,
            path: `${path.resolve('')}/the-news-${info.post['web_title'].replaceAll('/', '-')}.epub`,
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
    console.timeEnd('Script execution time');
})();
