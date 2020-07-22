
class Grid{

    constructor(){
        this.size = [0,0];
        this.grid = {};
    }

    get_size() {
        return [...this.size];
    }

    add_column_after(column){
        Object.keys(this.grid).forEach(key => {
            if(this.grid[key][0] > column){
                this.grid[key][0] += 1;
            }
        });
        this.size[0] += 1;
    }

    add_row_after(row){
        Object.keys(this.grid).forEach(key => {
            if(this.grid[key][1] > row){
                this.grid[key][1] += 1;
            }
        });
        this.size[1] += 1;
    }

    is_free(pos){
        const non_free = Object.keys(this.grid).map(key => this.grid[key]);
        return non_free.findIndex(el => el[0]===pos[0] && el[1]===pos[1]) === -1;
    }

    is_in_range(pos){
        return pos[0] <= this.size[0] && pos[1] <= this.size[1];
    }

    add_element(element_id, pos){
        if(!this.is_in_range(pos)){
            this.grid[element_id] = pos;
            this.size[0] = Math.max(this.size[0], pos[0]);
            this.size[1] = Math.max(this.size[1], pos[1]);
            return;
        }

        if(!this.is_free(pos)){
            throw Error("Trying to set a non free cell!");
        }

        this.grid[element_id] = pos;
    }

    seen_nodes(){
        return Object.keys(this.grid);
    }

    get_node_pos(node_id){
        return this.grid[node_id];
    }
}

module.exports = Grid;

