#!/usr/bin/env node
/**
 * shrd CLI - Drop a link. Get a blog post.
 */

import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { shrd, info, extract } from './index.js';
import { route, getPlatformName } from './router.js';
import { normalize } from './normalize.js';
import { generateFilename, formatHtml, formatJson, formatMarkdown } from './format.js';
import type { OutputFormat, OutputStyle, OutputTone } from './types.js';

const VERSION = '0.1.0';

program
  .name('shrd')
  .description('Drop a link. Get a blog post.')
  .version(VERSION)
  .argument('<url>', 'URL to process (YouTube, article, tweet, etc.)')
  .option('-o, --output <path>', 'Output file path (default: stdout)')
  .option('-f, --format <format>', 'Output format: markdown, html, json', 'markdown')
  .option('-s, --style <style>', 'Content style: blog, newsletter, tweet-thread, summary', 'blog')
  .option('-t, --tone <tone>', 'Writing tone: professional, casual, analytical', 'professional')
  .option('-p, --perspective <text>', 'Write from a specific perspective')
  .option('-e, --extract-only', 'Only extract content, skip blog generation')
  .option('-v, --verbose', 'Show detailed progress')
  .option('-i, --info', 'Show URL info only (platform detection)')
  .action(async (url: string, options) => {
    const {
      output,
      format: outputFormat,
      style,
      tone,
      perspective,
      extractOnly,
      verbose,
      info: infoOnly,
    } = options;

    try {
      // Info mode - just show platform detection
      if (infoOnly) {
        const urlInfo = await info(url);
        console.log(chalk.bold('URL Info:'));
        console.log(`  Platform: ${chalk.cyan(urlInfo.platformName)}`);
        console.log(`  Supported: ${urlInfo.supported ? chalk.green('Yes') : chalk.red('No')}`);
        return;
      }

      // Check platform
      const routeResult = route(url);
      if (routeResult.platform === 'unknown') {
        console.error(chalk.red('Error: Unsupported URL'));
        console.error('Supported platforms: YouTube, Twitter/X, TikTok, Instagram, Podcasts, Articles');
        process.exit(1);
      }

      const spinner = ora({
        text: `Processing ${getPlatformName(routeResult.platform)} content...`,
        isSilent: !verbose,
      }).start();

      // Extract content
      spinner.text = 'Extracting content...';
      const extracted = await extract(url);
      
      if (verbose) {
        spinner.succeed('Content extracted');
        console.log(chalk.dim(`  Title: ${extracted.title}`));
        console.log(chalk.dim(`  Author: ${extracted.author}`));
        if (extracted.transcript) {
          console.log(chalk.dim(`  Transcript: ${extracted.transcript.length} characters`));
        }
        spinner.start();
      }

      // Check for transcript on video content
      if (['youtube', 'tiktok', 'instagram'].includes(routeResult.platform)) {
        if (!extracted.transcript) {
          spinner.warn(chalk.yellow('No transcript available for this video'));
          console.log(chalk.dim('Tip: Use --extract-only to see available content'));
          
          if (!extractOnly) {
            const response = await promptContinue();
            if (!response) {
              console.log('Aborted.');
              process.exit(0);
            }
            spinner.start();
          }
        }
      }

      let result;
      
      if (extractOnly) {
        // Just normalize and output extraction
        spinner.text = 'Normalizing content...';
        const normalized = normalize(extracted);
        spinner.succeed('Content extracted');
        
        result = {
          blog: {
            title: extracted.title,
            description: extracted.description || '',
            insights: [],
            quotes: [],
          },
          source: normalized.source,
          embed: normalized.media.embedCode,
          markdown: formatMarkdown(
            { title: extracted.title, description: extracted.description || '', insights: [], quotes: [] },
            normalized
          ),
        };
      } else {
        // Full processing
        spinner.text = 'Generating blog post...';
        result = await shrd(url, {
          style: style as OutputStyle,
          tone: tone as OutputTone,
          perspective,
          outputFormat: outputFormat as OutputFormat,
          extractOnly,
        });
        spinner.succeed('Blog post generated');
      }

      // Format output based on requested format
      let outputContent: string;
      const normalized = normalize(extracted);
      
      switch (outputFormat) {
        case 'html':
          outputContent = formatHtml(result.blog, normalized);
          break;
        case 'json':
          // Full structured output for web app
          outputContent = JSON.stringify({
            blog: result.blog,
            source: normalized.source,
            embed: normalized.media.embedCode,
            markdown: result.markdown,
          }, null, 2);
          break;
        default:
          outputContent = result.markdown;
      }

      // Output
      if (output) {
        // Write to file
        const filepath = output.endsWith('/') 
          ? join(output, generateFilename(result.blog.title, outputFormat as OutputFormat))
          : output;
        
        mkdirSync(dirname(filepath), { recursive: true });
        writeFileSync(filepath, outputContent);
        console.log(chalk.green(`✓ Saved to ${filepath}`));
      } else {
        // Output to stdout
        console.log('\n' + outputContent);
      }

    } catch (error) {
      console.error(chalk.red(`Error: ${(error as Error).message}`));
      if (verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

/**
 * Simple yes/no prompt for continuing without transcript
 */
async function promptContinue(): Promise<boolean> {
  return new Promise((resolve) => {
    process.stdout.write(chalk.yellow('Continue without transcript? [y/N] '));
    
    process.stdin.setRawMode?.(true);
    process.stdin.resume();
    process.stdin.once('data', (data) => {
      const char = data.toString().toLowerCase();
      process.stdout.write('\n');
      process.stdin.setRawMode?.(false);
      process.stdin.pause();
      resolve(char === 'y');
    });
  });
}

program.parse();
