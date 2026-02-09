
import fs from 'fs';
import path from 'path';

const oldPath = path.join(process.cwd(), 'src/app/api/workspaces/[id]');
const newPath = path.join(process.cwd(), 'src/app/api/workspaces/[slug]');

try {
    if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
        console.log('Successfully renamed [id] to [slug]');
    } else {
        console.log('[id] directory not found');
    }
} catch (error) {
    console.error('Error renaming directory:', error);
}
