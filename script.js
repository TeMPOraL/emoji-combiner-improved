let emojiData = null;
let activeEmoji = null;
let offsetX = 0;
let offsetY = 0;
let emojiContainer;

async function loadEmojiData() {
    try {
        const response = await fetch('data/emoji-embeddings_6dp.jsonl');
        const text = await response.text();
        const lines = text.split('\n');

        let data = displayData(lines);

        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function displayData(lines) {
    let emojis = [];
    let emoji_embeddings = [];

    lines.forEach(line => {
        if (line) {
            const item = JSON.parse(line);

            emojis.push(item.emoji);
            emoji_embeddings.push(item.embed);
        }
    });

    return { emojis, emoji_embeddings };
}

function isPersonEmoji(emoji) {
    const skinTones = [
        '\ud83c\udffb', // light skin tone
        '\ud83c\udffc', // medium-light skin tone
        '\ud83c\udffd', // medium skin tone
        '\ud83c\udffe', // medium-dark skin tone
        '\ud83c\udfff', // dark skin tone
    ];

    // Human emojis without skin tones
    const basePersonEmojiRanges = [
        [0x1F466, 0x1F469], // boy, girl, man, woman
        [0x1F471, 0x1F475], // person with blond hair to older person
        [0x1F481, 0x1F483], // person tipping hand, person getting massage, dancer
        [0x1F485, 0x1F487], // nail polish, haircut, barber pole
        [0x1F57A],          // man dancing
        [0x1F645, 0x1F647], // person gesturing no, person gesturing ok, person bowing
        [0x1F64B, 0x1F64F], // person raising hand, person frowning, person pouting, person gesturing no, person gesturing ok
        [0x1F6A3],          // rowboat
        [0x1F6B4, 0x1F6B6], // bicyclist, mountain bicyclist, person walking
        [0x1F6C0],          // person taking bath
        [0x1F9D1, 0x1F9DD], // adult to elf, some include gender-neutral options
    ];

    // Check if the first codepoint of the emoji is a person
    const codePoint = emoji.codePointAt(0);
    for (const range of basePersonEmojiRanges) {
        if (Array.isArray(range)) {
            if (codePoint >= range[0] && codePoint <= range[1]) {
                return true;
            }
        } else {
            if (codePoint === range) {
                return true;
            }
        }
    }

    // Check if the emoji contains any skin tone modifiers
    for (const tone of skinTones) {
        if (emoji.includes(tone)) {
            return true;
        }
    }

    // Check for specific profession emojis that may not be covered by the above ranges
    const professionEmojis = [
        '\ud83e\udd35', // mage (includes wizards)
        '\ud83e\udd38', // fairy
        '\ud83e\udd3e', // artist (painter)
        // ... add more specific profession emojis if needed
    ];

    for (const professionEmoji of professionEmojis) {
        if (emoji.includes(professionEmoji)) {
            return true;
        }
    }

    return false;
}


function initializeEmojis(emojiData) {
    // const emoji_list = emojiData.emojis;
    const emoji_count = parseInt(document.getElementById('emoji-count').value, 10) || 20;
    const emoji_list = emojiData.emojis.filter(emoji => !isPersonEmoji(emoji));

    for (let i = 0; i < emoji_count; i++) {
        const emoji = document.createElement('div');
        emoji.innerText = emoji_list[Math.floor(Math.random() * emoji_list.length)];
        emoji.className = 'emoji';
        emoji.style.top = `${Math.random() * window.innerHeight}px`;
        emoji.style.left = `${Math.random() * window.innerWidth}px`;
        emojiContainer.appendChild(emoji);

        emoji.addEventListener('mousedown', startDrag);
    }
}

function startDrag(e) {
    activeEmoji = e.target;
    const rect = activeEmoji.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
}

function drag(e) {
    if (activeEmoji) {
        activeEmoji.style.left = `${e.clientX - offsetX}px`;
        activeEmoji.style.top = `${e.clientY - offsetY}px`;
    }
}

function stopDrag() {
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDrag);

    // Check for collisions
    const collidedEmoji = checkForCollision(activeEmoji);
    if (collidedEmoji) {
        combine_emojis(activeEmoji, collidedEmoji);
    }

    activeEmoji = null;
}

function checkForCollision(emoji) {
    const emojis = document.getElementsByClassName('emoji');
    for (let i = 0; i < emojis.length; i++) {
        if (emojis[i] !== emoji) {
            if (isOverlapping(emoji, emojis[i])) {
                return emojis[i];
            }
        }
    }
    return null;
}

function isOverlapping(elem1, elem2) {
    const rect1 = elem1.getBoundingClientRect();
    const rect2 = elem2.getBoundingClientRect();
    return !(
        rect1.right < rect2.left ||
        rect1.left > rect2.right ||
        rect1.bottom < rect2.top ||
        rect1.top > rect2.bottom
    );
}

function combine_emojis(emoji_a, emoji_b) {
    const emoji_a_text = emoji_a.innerText;
    const emoji_b_text = emoji_b.innerText;
    const combinedEmojiText = addEmojis(emoji_a_text, emoji_b_text);

    console.log(`'${emoji_a_text}' + '${emoji_b_text}' -> '${combinedEmojiText}'`);

    const combinedEmoji = document.createElement('div');
    combinedEmoji.innerText = combinedEmojiText;
    combinedEmoji.className = 'emoji';
    combinedEmoji.style.top = emoji_a.style.top;
    combinedEmoji.style.left = emoji_a.style.left;
    combinedEmoji.addEventListener('mousedown', startDrag); // Make the new emoji draggable
    emojiContainer.appendChild(combinedEmoji);

    emoji_a.remove();
    emoji_b.remove();
}

function addEmojis(emoji_a, emoji_b) {
    const embedding_a = getEmojiEmbedding(emoji_a);
    const embedding_b = getEmojiEmbedding(emoji_b);

    combined_embedding = embedding_a.map((num, idx) => (num + embedding_b[idx]) / 2);

    return getClosestEmoji(combined_embedding, emoji_a, emoji_b);
}

function getClosestEmoji(emoji_embedding, not_emoji_a, not_emoji_b) {
    let smallest_distance = Infinity;
    let closest_emoji = null;

    for (let i = 0; i < emojiData.emoji_embeddings.length; i++) {
        if (emojiData.emojis[i] !== not_emoji_a && emojiData.emojis[i] !== not_emoji_b) {
            const distance = getDistance(emoji_embedding, emojiData.emoji_embeddings[i]);
            if (distance < smallest_distance) {
                smallest_distance = distance;
                closest_emoji = emojiData.emojis[i];
            }
        }
    }

    return closest_emoji;
}

function getDistance(arr1, arr2) {
    return Math.sqrt(arr1.reduce((sum, value, index) => {
        return sum + Math.pow(value - arr2[index], 2);
    }, 0));
}

function getEmojiEmbedding(emoji) {
    return emojiData.emoji_embeddings[getEmojiPosition(emoji)];
}

function getEmojiPosition(emoji) {
    return emojiData.emojis.indexOf(emoji);
}

document.addEventListener('DOMContentLoaded', async () => {
    emojiContainer = document.getElementById('emoji-container');
    // Fetch and initialize emoji data
    emojiData = await loadEmojiData();
    initializeEmojis(emojiData);

    // Setup reset button event listener
    document.getElementById('reset-button').addEventListener('click', async () => {
        emojiContainer.innerHTML = ''; // Clear existing emojis
        emojiData = await loadEmojiData();
        initializeEmojis(emojiData);
    });
});
