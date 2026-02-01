import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { url, targetSite } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Call shrd CLI
    const { stdout, stderr } = await execAsync(
      `shrd "${url}" --format json`,
      {
        timeout: 120000,
        env: {
          ...process.env,
          PATH: `${process.env.HOME}/.npm-global/bin:/usr/local/bin:${process.env.PATH}`,
        },
      }
    );

    if (stderr && !stdout) {
      return NextResponse.json({ error: stderr }, { status: 500 });
    }

    const result = JSON.parse(stdout);
    result.targetSite = targetSite || 'shrd';

    return NextResponse.json(result);
  } catch (error) {
    console.error('Process error:', error);
    return NextResponse.json(
      { error: `Processing failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
