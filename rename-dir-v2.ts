
import fs from 'fs';
import path from 'path';

// Using raw strings to avoid escaping issues
const oldName = '[id]';
const newName = '[slug]';
const basePath = path.join(process.cwd(), 'src/app/api/workspaces');

const oldPath = path.join(basePath, oldName);
const newPath = path.join(basePath, newName);

console.log('Attempting to rename:');
console.log('From:', oldPath);
console.log('To:', newPath);

try {
    if (!fs.existsSync(oldPath)) {
        console.error('ERROR: Source directory does not exist!');
        process.exit(1);
    }

    if (fs.existsSync(newPath)) {
        console.warn('WARNING: Target directory already exists. Attempting to merge/overwrite...');
        // In a real scenario, we might want to be more careful, but here we want to enforce [slug]
    }

    fs.renameSync(oldPath, newPath);
    console.log('SUCCESS: Renamed directory.');
} catch (error) {
    console.error('CRITICAL ERROR:', error);

    // Fallback: Copy and Delete
    try {
        console.log('Attempting fallback: Copy and Delete...');
        fs.cpSync(oldPath, newPath, { recursive: true });
        console.log('Copy successful.');
        fs.rmSync(oldPath, { recursive: true, force: true });
        console.log('Delete successful.');
        console.log('SUCCESS: Moved directory via copy-delete.');
    } catch (fallbackError) {
        console.error('FALLBACK FAILED:', fallbackError);
    }
}
