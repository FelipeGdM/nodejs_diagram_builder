/* eslint-disable no-plusplus */
/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable no-restricted-syntax */
/* eslint-disable guard-for-in */
/* eslint-disable camelcase */
/**
 * @file xml_grid.js
 *
 * @brief Implements the grid class described in (Kitzmann, 2009)
 *
 * @author Felipe Gomes de Melo <felipe.melo@fdte.io>
 * @author Gabriel Lopes Rodriges <gabriel.rodrigues@fdte.io>
 *
 * Based in the paper Kitzmann, Ingo, et al. 2009
 * "A simple algorithm for automatic layout of bpmn processes."
 */

class Grid {
  constructor() {
    this.size = [0, 0];
    this.grid = {};
  }

  get_size() {
    return [...this.size];
  }

  add_column_after(column) {
    Object.keys(this.grid).forEach((key) => {
      if (this.grid[key][0] > column) {
        this.grid[key][0] += 1;
      }
    });
    this.size[0] += 1;
  }

  add_row_after(row) {
    Object.keys(this.grid).forEach((key) => {
      if (this.grid[key][1] > row) {
        this.grid[key][1] += 1;
      }
    });
    this.size[1] += 1;
  }

  delete_row(row) {
    Object.keys(this.grid).forEach((key) => {
      if (this.grid[key][1] > row) {
        this.grid[key][1] -= 1;
      }
    });
    this.size[1] -= 1;
  }

  is_free(pos) {
    const non_free = Object.keys(this.grid).map((key) => this.grid[key]);
    return non_free.findIndex((el) => el[0] === pos[0] && el[1] === pos[1]) === -1;
  }

  is_in_range(pos) {
    return pos[0] <= this.size[0] && pos[1] <= this.size[1];
  }

  add_element(element_id, pos) {
    if (!this.is_in_range(pos)) {
      this.grid[element_id] = pos;
      this.size[0] = Math.max(this.size[0], pos[0]);
      this.size[1] = Math.max(this.size[1], pos[1]);
      return;
    }

    if (!this.is_free(pos)) {
      throw Error('Trying to set a non free cell!');
    }

    this.grid[element_id] = pos;
  }

  seen_nodes() {
    return Object.keys(this.grid);
  }

  get_node_pos(node_id) {
    return this.grid[node_id];
  }

  merge_row_below(row) {
    let mergeble = true;
    const new_row = [];

    for (let column = 0; column < this.size[0]; column++) {
      const above_row = Object.keys(this.grid).find((node_id) => this.grid[node_id][0] === column && this.grid[node_id][1] === row);
      const below_row = Object.keys(this.grid).find((node_id) => this.grid[node_id][0] === column && this.grid[node_id][1] === row + 1);
      if (above_row !== undefined && below_row !== undefined) {
        mergeble = false;
        break;
      }
      new_row.push([above_row || below_row, column]);
    }

    if (!mergeble) {
      return false;
    }

    new_row.forEach((el) => {
      this.grid[el[0]] = [el[1], row];
    });

    this.delete_row(row + 1);
    return true;
  }

  simplify() {
    let row = 0;
    while (row < this.size[1]) {
      if (!this.merge_row_below(row)) {
        row++;
      }
    }
  }
}

module.exports = Grid;
