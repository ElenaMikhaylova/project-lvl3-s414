import '@babel/polyfill';
import axios from 'axios';
import isURL from 'validator/lib/isURL';
import { watch } from 'melanke-watchjs';
import _ from 'lodash';
import $ from 'jquery';

const errors = {
  invalidURL: 'URL is invalid',
  doubleURL: 'URL has already been added',
  errorXML: 'URL is not RSS format',
  notFound: 'URL is not found',
};

const renderForm = (state) => {
  const inputURL = document.getElementById('inputURL');
  const btnAddFeed = document.getElementById('btnAddFeed');
  btnAddFeed.disabled = state.formState !== 'valid';
  inputURL.disabled = state.formState === 'waiting';
  inputURL.value = state.formState === 'empty' ? '' : inputURL.value;
  if (state.formState === 'invalid') {
    inputURL.classList.add('is-invalid');
  } else {
    inputURL.classList.remove('is-invalid');
  }
};

const renderError = (state) => {
  const textURLError = document.getElementById('urlError');
  const errorText = errors[state.error];
  if (errorText) {
    textURLError.textContent = errorText;
  } else {
    textURLError.textContent = state.error;
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
      const { title, description, link } = article;
      return `<li class="list-group-item"><a href="${link}">${title}</a>
        <button type="button" class="btn btn-info btn-sm" data-toggle="modal" data-target="#articleDescriptionModal" data-description="${description}">...</button></li>`;
    })
    .join('');
  divArticles.innerHTML = `<ul class="list-group">${html}</ul>`;
};

const parseXml = (xml) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    return null;
  }
  const items = [...doc.querySelectorAll('item')].reduce((acc, item) => {
    const title = item.querySelector('title').textContent;
    const description = item.querySelector('description').textContent;
    const link = item.querySelector('link').textContent;
    return [...acc, { title, description, link }];
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
    state.formState = 'waiting';
    axios.get(`https://cors-anywhere.herokuapp.com/${link}`)
      .then((response) => {
        const feed = parseXml(response.data);
        if (!feed) {
          state.formState = 'error';
          state.error = 'errorXML';
        } else {
          const { title, description, items } = feed;
          state.feeds = [...state.feeds, { title, description, link }];
          state.articles = [...state.articles, ...items];
          state.formState = 'empty';
          state.error = null;
        }
      })
      .catch((error) => {
        state.formState = 'error';
        if (error.response.status === 404) {
          state.error = 'notFound';
        } else {
          state.error = error;
        }
      });
  });

  $('#articleDescriptionModal').on('show.bs.modal', function (event) {
    const description = $(event.relatedTarget).data('description');
    $(this).find('.modal-body').text(description);
  });

  const btnArticleDesription = document.querySelectorAll('button[data-toggle="modal"]');
  btnArticleDesription.forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      $('#articleDescriptionModal').modal();
    });
  });
};
