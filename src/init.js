import '@babel/polyfill';
import axios from 'axios';
import isURL from 'validator/lib/isURL';
import { watch } from 'melanke-watchjs';
import _ from 'lodash';

const renderForm = (state) => {
  const inputURL = document.getElementById('inputURL');
  const btnAddFeed = document.getElementById('btnAddFeed');
  btnAddFeed.disabled = state.formState !== 'valid';
  inputURL.disabled = state.formState === 'wait';
  inputURL.value = state.formState === 'empty' ? '' : inputURL.value;
  inputURL.style.border = state.formState === 'invalid' ? 'thick solid red' : null;
};

const renderError = (state) => {
  const textURLError = document.getElementById('urlError');
  switch (state.error) {
    case 'invalidURL': {
      textURLError.textContent = 'URL is invalid';
      break;
    }
    case 'doubleURL': {
      textURLError.textContent = 'URL has already been added';
      break;
    }
    default: {
      textURLError.textContent = state.error;
    }
  }
};

const renderFeeds = (state) => {
  const divFeeds = document.getElementById('feeds');
  const html = state.feeds
    .map((feed) => {
      const { title, description } = feed;
      return `<li class="list-group-item"><p>${title}</p><small>${description}</small></li>`;
    })
    .join('');
  divFeeds.innerHTML = `<ul class="list-group">${html}</ul>`;
};

const renderArticles = (state) => {
  const divArticles = document.getElementById('articles');
  const html = state.articles
    .map((article) => {
      const { title, link } = article;
      return `<li class="list-group-item"><a href="${link}">${title}</a></li>`;
    })
    .join('');
  divArticles.innerHTML = `<ul class="list-group">${html}</ul>`;
};

const parseXml = (xml) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const items = [...doc.querySelectorAll('item')].reduce((acc, item) => {
    const title = item.querySelector('title').textContent;
    const link = item.querySelector('link').textContent;
    return [...acc, { title, link }];
  }, []);
  return {
    title: doc.querySelector('channel > title').textContent,
    description: doc.querySelector('channel > description').textContent,
    items,
  };
};

export default () => {
  const state = {
    formState: 'empty',
    error: null,
    feeds: [],
    articles: [],
  };

  watch(state, 'formState', () => renderForm(state));
  watch(state, 'error', () => renderError(state));
  watch(state, 'feeds', () => renderFeeds(state));
  watch(state, 'articles', () => renderArticles(state));

  const inputURL = document.getElementById('inputURL');
  inputURL.addEventListener('keyup', ({ target }) => {
    if (target.value === '') {
      state.formState = 'empty';
      state.error = null;
    } else if (!isURL(target.value)) {
      state.formState = 'invalid';
      state.error = 'invalidURL';
    } else if (_.find(state.feeds, ['link', target.value])) {
      state.formState = 'invalid';
      state.error = 'doubleURL';
    } else {
      state.formState = 'valid';
      state.error = null;
    }
  });

  const btnAddFeed = document.getElementById('btnAddFeed');
  btnAddFeed.addEventListener('click', (event) => {
    event.preventDefault();
    const link = inputURL.value;
    state.formState = 'wait';
    axios.get(`https://cors-anywhere.herokuapp.com/${link}`)
      .then((response) => {
        const feed = parseXml(response.data);
        const { title, description, items } = feed;
        state.feeds = [...state.feeds, { title, description, link }];
        state.articles = [...state.articles, ...items];
        state.formState = 'empty';
      })
      .catch((error) => {
        state.error = error;
        state.formState = 'empty';
      });
  });
};
